import FrameService from './frame-service';
import tap from 'tap';

tap.test('correctly identifies the number of frames within a buffer', (t) => {
    const fs = new FrameService();
    const buf = new Uint8Array([
        0xF1, 0xAA, 0x33, 0x93, 0xFF, 0xFB, 0x1A, 0x22, 0x44, 0x45, 0xFF, 0xFB
    ]);

    fs.readChunk(Buffer.from(buf));
    
    t.equal(fs.frameCount, 2, 'Should contain 2 frames.');
    t.end();
});

tap.test('correctly identifies the number of frames across buffers', (t) => {
    const fs = new FrameService();
    const buf1 = new Uint8Array([
        0x00, 0xFF,
    ]);

    const buf2 = new Uint8Array([
        0xF0, 0x00
    ])

    fs.readChunk(Buffer.from(buf1));
    t.equal(fs.frameCount, 0, 'should have no frames');
    fs.readChunk(Buffer.from(buf2));
    t.equal(fs.frameCount, 1, 'should have 1 frame');

    t.end();
})

tap.test('clearing the service', (t) => {
    const fs = new FrameService();
    const buf = new Uint8Array([
        0xFF, 0xFB, 0x00, 0xFF
    ]);

    fs.readChunk(Buffer.from(buf));

    t.equal(fs["_prevByte255"], true, 'should have prevByte before clear');
    t.equal(fs.frameCount, 1, 'should have 1 frame before clear');

    fs.clear();
    t.equal(fs["_prevByte255"], false, 'should not have prevByte after clear');
    t.equal(fs.frameCount, 0, 'should have 0 frames after clear');
    
    t.end();
});