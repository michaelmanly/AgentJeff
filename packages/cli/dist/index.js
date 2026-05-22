#!/usr/bin/env node
#!/usr/bin/env node
"use strict";

// src/index.ts
var import_commander = require("commander");
var import_sdk = require("@newatom/sdk");
var import_examples = require("@newatom/examples");
var import_examples2 = require("@newatom/examples");
var program = new import_commander.Command();
program.name("newatom").description("newatom agent runtime CLI").version("0.1.0");
program.command("run:workspace").description("Run the workspace assistant on a local directory").argument("<path>", "workspace path").argument("[task]", "task to perform", "Summarize the repository structure.").option("--events", "show all events").action(async (wsPath, task, opts) => {
  const agent = (0, import_examples.buildWorkspaceAgent)(wsPath);
  const run = await (0, import_sdk.executeRun)({
    agent,
    input: { task, path: wsPath },
    inferenceAdapter: new import_sdk.BadgrAdapter(),
    onEvent: opts.events ? (e) => console.log(`[${e.type}]`, JSON.stringify(e.payload).slice(0, 120)) : void 0
  });
  if (opts.events) console.log("\n--- Events ---", run.events.length);
  console.log("\n--- Result ---");
  console.log(run.result);
  console.log(`Status: ${run.status}`);
});
program.command("run:extract").description("Run structured extraction on text").argument("<text>", "text to extract from").option("--events", "show all events").action(async (text, opts) => {
  const run = await (0, import_sdk.executeRun)({
    agent: import_examples2.extractionAgent,
    input: { text },
    inferenceAdapter: new import_sdk.BadgrAdapter(),
    onEvent: opts.events ? (e) => console.log(`[${e.type}]`, JSON.stringify(e.payload).slice(0, 120)) : void 0
  });
  if (opts.events) console.log("\n--- Events ---", run.events.length);
  console.log("\n--- Extracted ---");
  console.log(JSON.stringify(run.result, null, 2));
  console.log(`Status: ${run.status}`);
});
program.parse();
