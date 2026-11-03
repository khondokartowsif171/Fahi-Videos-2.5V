"use strict";
const assert = require("node:assert/strict");
const { vertexOutputUrl } = require("../ops/managed-worker.cjs");

const objectUrl = vertexOutputUrl("gs://aura-private-media/jobs/one.mp4");
assert.equal(objectUrl.origin, "https://storage.googleapis.com");
assert.equal(objectUrl.pathname, "/aura-private-media/jobs/one.mp4");

const httpsUrl = vertexOutputUrl("https://storage.googleapis.com/bucket/job%20one.mp4");
assert.equal(httpsUrl.origin, "https://storage.googleapis.com");

for (const value of [
  "gs://bucket",
  "gs:///object.mp4",
  "https://evil.example/object.mp4",
  "http://storage.googleapis.com/object.mp4",
]) {
  assert.throws(() => vertexOutputUrl(value), undefined, value);
}

console.log("Vertex output URL validation passed (4 valid/invalid cases).");
