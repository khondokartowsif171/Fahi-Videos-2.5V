const ytdl = require('youtube-dl-exec');
ytdl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
  dumpSingleJson: true
})
.then(output => {
  console.log("Success:", output.title);
})
.catch(e => {
  console.error("Error:", e);
});
