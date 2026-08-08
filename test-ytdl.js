const ytdl = require("@distube/ytdl-core");
ytdl.getInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ').then(info => {
    console.log("Success:", info.videoDetails.title);
}).catch(e => {
    console.error("Error:", e.message);
});
