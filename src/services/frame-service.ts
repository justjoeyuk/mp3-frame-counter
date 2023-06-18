// If you want more information on where this information was found and how 
// the specific bit values are known, see: http://www.mp3-tech.org/programmer/frame_header.html

enum MPEG_ID_BIT_UINT2 {
    MPEG2_5 = 0,
    RESERVED = 1,
    MPEG2 = 2,
    MPEG1 = 3
}

enum MPEG_LAYER_UINT2 {
    INVALID = 0,
    LAYER3 = 1,
    LAYER2 = 2,
    LAYER1 = 3
}

// You can use this to get the required offset for the BR_TABLE by accessing the index with the value of an MPEG_ID_BIT_UINT2
// MPEG2_5 & RESERVED are treated as MPEG1 at the moment, additional error validation can be added by changing these values to -1, for example.
const BR_TABLE_ID_OFFSET_ARR = [0, 0, 1, 0];

// You can use this to get the required offset for the BR_TABLE by accessing the index with the value of an MPEG_LAYER_UINT2
// INVALID is treated as Layer 3 at the moment, additional error validation can be added by changing the first value to -1, for example.
const BR_TABLE_LAYER_OFFSET_ARR = [1, 2, 1, 0];

// The indexes correspond to the bitrates with respect to the 4 bits in the Frame Header.
// [ MPEG1-L1, MPEG1-L2, MPEG1-L3, MPEG2-L1, MPEG2-L2, MPEG2-L3 ]
//
// You can access bitrate by doing:
// BR_TABLE[bitrateBit value][(BR_TABLE_ID_OFFSET_ARR[MPEG_ID] * 3) + BR_TABLE_LAYER_OFFSET_ARR[MPEG_LAYER]]

const BR_TABLE = [
    [],
    [32, 32, 32, 32, 32, 8],
    [64, 48, 40, 64, 48, 16],
    [96, 56, 48, 96, 56, 24],
    [128, 64, 56, 128, 64, 32],
    [160, 80, 64, 160, 80, 64],
    [192, 96, 80, 192, 96, 80],
    [224, 112, 96, 224, 112, 56],
    [256, 128, 112, 256, 128, 64],
    [288, 160, 128, 288, 160, 128],
    [320, 192, 160, 320, 192, 160],
    [352, 224, 192, 352, 224, 112],
    [384, 256, 224, 384, 256, 128],
    [416, 320, 256, 416, 320, 256],
    [448, 384, 320, 448, 384, 320],
    []
]

type FrameHeader = {
    id: MPEG_ID_BIT_UINT2 | undefined;
    layer: MPEG_LAYER_UINT2 | undefined;
    bitrateKhz: number;

    currentByteOffset: number;
}

class FrameService {

    private _prevByte255: boolean = false; // If the last byte registered was equal to 0xFF
    public frameCount: number = 0; // The total number of frames counted

    private _prevFrameByteOffset = 0; // The number of bytes we are offset from the start of the previous frame header. Can be used to perform the look-ahead validation.
    private _prevFrameHeader: FrameHeader | undefined; // The details of the last known frame


    readChunk(buffer: Buffer) {
        let chunkFrames = 0;

        for (let bidx = 0; bidx < buffer.length; bidx++) {
            const byte = buffer[bidx];
            
            // Frame Headers are found by a Frame Sync, which is 0xFFF.
            // We check if the previous byte was 0xFF and then check for 0xF on the next byte.

            // We are checking that all 12 initial bits are `1` which rules out Reserved and MPEG2.5
            // If the 12th bit is 0, that denotes either an MPEG_2.5 or Reserved Identifier
            if (this._prevByte255 && (byte >> 4) === 0xF) {
                this._prevFrameHeader = {
                    id: byte & (0b00011000) >> 3,
                    layer: (byte & 0b00000110),
                    bitrateKhz: 0,
                    currentByteOffset: 1
                }

                chunkFrames += 1;
            }

            if (this._prevFrameHeader?.currentByteOffset === 2) {
                const bitRateIdx = (byte & 0xF0) >> 4;

                if (this._prevFrameHeader?.id && this._prevFrameHeader?.layer) {
                    const frameId = this._prevFrameHeader.id.valueOf();
                    const frameLayer = this._prevFrameHeader.layer.valueOf();

                    const bitrateRaw = BR_TABLE[bitRateIdx][(BR_TABLE_ID_OFFSET_ARR[frameId] * 3) + BR_TABLE_LAYER_OFFSET_ARR[frameLayer]];

                    if (!isNaN(bitrateRaw)) {
                        // We can now consider this a frame as the order of bits are starting to show that it's an MPEG Frame Header.
                        // This is not a great way to verify a frame, we should do a look-ahead but the bitrate can assist in calculating 
                        // the frame size.
                        this._prevFrameHeader.bitrateKhz = bitrateRaw * 1000;
                        this._prevFrameByteOffset = this._prevFrameHeader.currentByteOffset;
                    } else {
                        // If this didn't translate to a value in the table, it's another safety measure we can take in finding false positives.
                        // Treat this as a disregarded frame.
                        this._prevFrameHeader = undefined;
                        chunkFrames -= 1;
                    }

                }
            }

            this._prevFrameByteOffset += 1;
            this._prevByte255 = byte === 0xFF;
        }

        this.frameCount += chunkFrames;
    }

    clear() {
        this.frameCount = 0;
        this._prevByte255 = false;
    }

}

export default FrameService;