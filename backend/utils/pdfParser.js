import { createRequire } from "module";
const require = createRequire(import.meta.url);
// load CommonJS version safely
const pdf = require("pdf-parse/lib/pdf-parse.js");
export default pdf;
