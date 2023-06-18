### Framp3
#### Gotta count 'em all

##### Important Note
There's almost no error handling or validation in this, simply due to time constraints. There are tons of methods that could be used for error handling but ultimately, these been omitted. An example would be the values in the Frame Header for the bitrate, a value of `0xF` is invalid. The program could identify many none-mp3 files as mp3 due to the fact that frame validation isn't using lookahead and false positives are possible.

I thoroughly enjoyed learning more about MP3s (despite the pain) and most of my knowledge came from [Here](https://www.compuphase.com/mp3/sta013.htm#:~:text=Typically%2C%20an%20MP3%20file%20stands,but%20not%20exactly%2026%20ms.), [here](http://www.multiweb.cz/twoinches/mp3inside.htm#CBR) and [here](http://www.mp3-tech.org/programmer/frame_header.html).


##### General Notes

MPEG 2.5 isn't supported, due to the method of detecting frame headers. I am aware that XING and VBRI tags actually contain metadata for the number of frames in the file, but for wider compatibility, the decision was made to count the frames using a different method.

My approach is to have an endpoint that accepts `multipart/form-data` and uses busboy so that we can easily read the data in chunks. The key idea behind this is so that the file could actually be parsed as it was uploaded, providing a super-fast response time and leaning into the scalability of the application. The FrameService is capable of counting frames across buffers.

I've done quite a naive search for frames. I do a simple check for a Frame Header Sync (1 byte being 0xFF and another byte being 0xF-). If this is the case, I proceed to treat it like a frame and attempt to extract the BitRate. The reason I deemed the BitRate important is for the extensibility of the application. If I wanted to add better validation in the future, the best method would likely be a "frame look-ahead", where I look for a frame header at the point the current frame data ends.

Since frame size can be dynamic (VBR), the only way to reliably know the size of the frame is to calculate it using the formula:

`(samples_per_frame * bitrate) / (8 * sample_rate)`

The `samples_per_frame` can be obtained via a table in a similar manner to the `bitrate` and so I knew that if I could calculate the bitrate, the other paramers necessary for the look-ahead validation could be discovered too. The FrameService has been built in such a manner that adding this functionality wouldn't be time consuming.


##### Overview

A lightweight server (via Fastify) that can accept an MP3 file via a `multipart/form-data` request and return the number of frames in the MP3 file.

Server Framework: Fastify
Testing Framework: TAP
Logging: Pino Pretty


##### Usage

You can run `npm start` to build and run the server. You can then make a multipart/form-data `POST` request to `http://localhost:3000/file-upload` with your `mp3` file as a field.

There are implicit limits on filesizes I believe, but nothing has been explicitly set, so proceed with caution.