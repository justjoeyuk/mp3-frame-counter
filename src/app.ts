import { fastify } from "fastify";
import multipart from "@fastify/multipart";
import FrameService from "./services/frame-service";

const buildServer = (opts = {}) => {
  const app = fastify(opts);
  app.register(multipart);

  app.post("/frames", async function (req, res) {
    const data = await req.file();

    const parseTask: Promise<number> = new Promise((resolve, reject) => {
        const fs = new FrameService();

        if (!data) {
          return reject("Invalid File");
        }

        data.file.on('error', (err) => {
            reject(err.message);
        });
        
        data.file.on('data', (chunk: Buffer) => {
            fs.readChunk(chunk);
        });
    
        data.file.on('end', () => {
            if (fs.frameCount > 0) {
                resolve(fs.frameCount);
            } else {
                reject("Unrecognized File Format");
            }
        });    
    });

    try {
        const frameCount = await parseTask;
        res.status(200).send({
            frameCount
        });
    } catch (e) {
        res.status(500).send(e);
    }
  });

  return app;
};

export default buildServer;
