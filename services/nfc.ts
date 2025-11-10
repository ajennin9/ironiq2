import { Platform } from 'react-native';
import { CompactNFCPayload } from '@/types/workout';

// Conditional imports for NFC (only on native platforms)
let NfcManager: any = null;
let NfcTech: any = null;
let Ndef: any = null;
let NfcEvents: any = null;

if (Platform.OS !== 'web') {
  try {
    const nfcModule = require('react-native-nfc-manager');
    NfcManager = nfcModule.default;
    NfcTech = nfcModule.NfcTech;
    Ndef = nfcModule.Ndef;
    NfcEvents = nfcModule.NfcEvents;
  } catch (error) {
    console.warn('react-native-nfc-manager not available:', error);
  }
}

export class NFCService {
  private static instance: NFCService;
  private isInitialized = false;

  static getInstance(): NFCService {
    if (!NFCService.instance) {
      NFCService.instance = new NFCService();
    }
    return NFCService.instance;
  }

  async initialize(): Promise<boolean> {
    if (Platform.OS === 'web' || !NfcManager) {
      console.log('NFC not available on web platform');
      return false;
    }

    try {
      const supported = await NfcManager.isSupported();
      if (!supported) {
        console.log('NFC not supported on this device');
        return false;
      }

      await NfcManager.start();
      this.isInitialized = true;
      console.log('NFC Manager initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize NFC Manager:', error);
      return false;
    }
  }

  async isEnabled(): Promise<boolean> {
    if (Platform.OS === 'web' || !NfcManager) {
      return false;
    }
    
    try {
      return await NfcManager.isEnabled();
    } catch (error) {
      console.error('Failed to check NFC status:', error);
      return false;
    }
  }

  async readTag(): Promise<CompactNFCPayload> {
    if (Platform.OS === 'web' || !NfcManager) {
      throw new Error('NFC not available on web platform');
    }

    if (!this.isInitialized) {
      throw new Error('NFC Manager not initialized');
    }

    // Retry logic for intermittent NFC read failures
    const maxRetries = 3;
    const retryDelay = 500; // 500ms between retries
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`NFC read attempt ${attempt}/${maxRetries}`);
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('NFC read timeout')), 10000); // 10 second timeout
        });

        // Try NDEF reading (should work with device's NDEF implementation)
        const ndefPromise = this.readNDEFTag();
        const payload = await Promise.race([ndefPromise, timeoutPromise]);
        console.log(`NFC read successful on attempt ${attempt}`);
        return payload;

      } catch (error) {
        console.error(`NFC read attempt ${attempt} failed:`, error);
        
        // Ensure cleanup
        try {
          await NfcManager.cancelTechnologyRequest();
        } catch (cleanupError) {
          console.log('Cleanup error:', cleanupError);
        }
        
        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    // This should never be reached due to the throw in the loop
    throw new Error('NFC read failed after all retry attempts');
  }

  private async readNDEFTag(): Promise<CompactNFCPayload> {
    try {
      // Request NFC technology
      await NfcManager.requestTechnology(NfcTech.Ndef);
      
      // Read NDEF message
      const tag = await NfcManager.getTag();
      console.log('NFC Tag detected:', tag);

      if (!tag?.ndefMessage || tag.ndefMessage.length === 0) {
        throw new Error('No NDEF data found on tag');
      }

      // Parse the first NDEF record
      const record = tag.ndefMessage[0];
      if (!record?.payload) {
        throw new Error('No payload found in NDEF record');
      }

      console.log('NDEF Record type:', record.type);
      console.log('NDEF Record TNF:', record.tnf);

      // Convert payload to string based on record type
      let payloadString: string;
      
      // Check if this is our expected application/json MIME record
      if (record.type && this.isJsonMimeRecord(record)) {
        console.log('Found application/json MIME record');
        // For MIME records, payload is the raw JSON (no language prefix)
        payloadString = this.bytesToString(record.payload);
      } else {
        console.log('Found text or other record type, using standard parsing');
        // Fallback to standard NDEF text parsing (handles language codes)
        payloadString = this.parseNdefPayload(record.payload);
      }
      
      console.log('Raw NFC payload:', payloadString);

      // Parse JSON as compact format
      try {
        const compactPayload = JSON.parse(payloadString) as CompactNFCPayload;
        console.log('Parsed compact NFC data:', compactPayload);
        
        // Validate compact payload structure
        if (!compactPayload.m || !compactPayload.t || !compactPayload.a || !Array.isArray(compactPayload.s)) {
          throw new Error('Invalid compact NFC payload structure');
        }
        
        return compactPayload;
      } catch (parseError) {
        console.error('Failed to parse compact NFC JSON:', parseError);
        throw new Error('Invalid JSON format in NFC tag');
      }

    } catch (error) {
      console.error('NFC read error:', error);
      throw error;
    } finally {
      // Always cancel the NFC request
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (cancelError) {
        console.error('Failed to cancel NFC request:', cancelError);
      }
    }
  }

  private isJsonMimeRecord(record: any): boolean {
    if (!record.type) return false;
    
    // Convert type to string for comparison
    const typeString = this.bytesToString(record.type);
    return typeString === 'application/json';
  }

  private parseNdefPayload(payload: number[]): string {
    // NDEF Text Record format: [encoding][lang_length][lang_code...][text...]
    if (payload.length < 3) {
      throw new Error('NDEF payload too short');
    }
    
    const encoding = payload[0] & 0x80 ? 'utf-16' : 'utf-8';
    const langLength = payload[0] & 0x3F;
    
    if (payload.length < 1 + langLength) {
      throw new Error('Invalid NDEF text record structure');
    }
    
    // Skip language code and extract text
    const textBytes = payload.slice(1 + langLength);
    return this.bytesToString(textBytes);
  }

  private bytesToString(bytes: number[]): string {
    return String.fromCharCode(...bytes);
  }

  async stopReading(): Promise<void> {
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch (error) {
      console.error('Failed to stop NFC reading:', error);
    }
  }

  async cleanup(): Promise<void> {
    try {
      await NfcManager.cancelTechnologyRequest();
      await NfcManager.unregisterTagEvent();
    } catch (error) {
      console.error('Failed to cleanup NFC:', error);
    }
  }

  // Method to start listening for NFC tags (alternative to manual read)
  async startTagListener(onTagDetected: (payload: CompactNFCPayload) => void): Promise<void> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('NFC not available on this device');
      }
    }

    try {
      // Register for tag detection
      await NfcManager.registerTagEvent();
      
      // Set up listener
      const tagEventListener = NfcManager.setEventListener(NfcEvents.DiscoverTag, async (tag: any) => {
        try {
          console.log('Tag discovered:', tag);
          
          // Try to read tag data using our main readTag method
          const payload = await this.readTag();
          onTagDetected(payload);
          
        } catch (error) {
          console.error('Error processing discovered tag:', error);
        }
      });
      
      return tagEventListener;
    } catch (error) {
      console.error('Failed to start tag listener:', error);
      throw error;
    }
  }

  async stopTagListener(): Promise<void> {
    try {
      await NfcManager.unregisterTagEvent();
      NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
    } catch (error) {
      console.error('Failed to stop tag listener:', error);
    }
  }

  // Handle empty tap detection (when tag is detected but no payload is available)
  isEmptyTap(error: any): boolean {
    // Check for various error patterns that indicate an empty tap
    const errorMessage = error?.message?.toLowerCase() || '';
    
    return (
      errorMessage.includes('no ndef data') ||
      errorMessage.includes('empty json') ||
      errorMessage.includes('invalid json') ||
      errorMessage.includes('nfc read timeout') ||
      errorMessage.includes('could not establish') ||
      // Add other patterns that indicate payload transmission failure
      (error && !errorMessage.includes('not supported') && !errorMessage.includes('not available'))
    );
  }

  // Create a method to handle the retry prompt
  handleEmptyTap(): { shouldRetry: boolean; message: string } {
    return {
      shouldRetry: true,
      message: 'Tap detected but no data received. Please tap your phone to the device again.'
    };
  }
}

export const nfcService = NFCService.getInstance();