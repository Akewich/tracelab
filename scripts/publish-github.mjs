import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repository = "Akewich/tracelab";

function command(program, args) {
  const result = spawnSync(program, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 30_000,
  });
  return {
    ok: result.status === 0 && !result.error,
    output: result.stdout?.trim() ?? "",
    error: result.error?.message ?? result.stderr?.trim() ?? "Command failed",
  };
}

function fail(message) {
  console.error(`GitHub publication stopped: ${message}`);
  process.exit(1);
}

const gitRoot = command("git", ["rev-parse", "--show-toplevel"]);
if (!gitRoot.ok || resolve(gitRoot.output) !== root) {
  fail(
    "TraceLab needs its own Git repository and reviewed initial commit. No files were staged or committed.",
  );
}

const commit = command("git", ["rev-parse", "--verify", "HEAD"]);
if (!commit.ok) {
  fail(
    "Create a reviewed initial commit before publishing. This script never stages or commits files.",
  );
}

const branch = command("git", ["branch", "--show-current"]);
if (branch.output !== "main")
  fail("Run publication from the reviewed main branch.");

const status = command("git", ["status", "--porcelain"]);
if (!status.ok || status.output) {
  fail(
    "The working tree must be clean so the exact reviewed commit is published.",
  );
}

const tracked = command("git", ["ls-files"]);
if (!tracked.ok) fail("Could not inspect tracked files.");
const unsafeFiles = tracked.output
  .split("\n")
  .filter(
    (path) => /(^|\/)\.env($|\.)/.test(path) && !path.endsWith(".env.example"),
  );
if (unsafeFiles.length)
  fail(
    "A non-example environment file is tracked. Remove it from the commit before publication.",
  );

const auth = command("gh", ["auth", "status", "--hostname", "github.com"]);
if (!auth.ok) {
  fail(
    "GitHub CLI authentication or connectivity is unavailable. Run gh auth login --hostname github.com in a network-enabled terminal, then retry.",
  );
}

const account = command("gh", ["api", "user", "--jq", ".login"]);
if (!account.ok || account.output.toLowerCase() !== "akewich") {
  fail(
    "The intended owner is Akewich. Authenticate that account before creating or pushing the repository.",
  );
}

const origin = command("git", ["remote", "get-url", "origin"]);
if (origin.ok) {
  const normalized = origin.output
    .replace(/\.git$/, "")
    .replace(/^git@github\.com:/, "https://github.com/");
  if (
    normalized.toLowerCase() !==
    `https://github.com/${repository}`.toLowerCase()
  ) {
    fail(
      "The existing origin points somewhere other than Akewich/tracelab. It was not changed.",
    );
  }
  const remote = command("gh", [
    "repo",
    "view",
    repository,
    "--json",
    "isPrivate,nameWithOwner",
  ]);
  let details;
  try {
    details = JSON.parse(remote.output);
  } catch {
    fail(
      "Could not verify the GitHub repository. Check connectivity and access.",
    );
  }
  if (
    !remote.ok ||
    !details.isPrivate ||
    details.nameWithOwner.toLowerCase() !== repository.toLowerCase()
  ) {
    fail(
      "The destination could not be verified as the intended private repository.",
    );
  }
  const push = command("git", ["push", "--set-upstream", "origin", "main"]);
  if (!push.ok)
    fail(`Push failed without forcing or rewriting history. ${push.error}`);
} else {
  // gh fails safely if the repository already exists; it does not overwrite it.
  const created = command("gh", [
    "repo",
    "create",
    repository,
    "--private",
    "--source",
    root,
    "--remote",
    "origin",
    "--push",
  ]);
  if (!created.ok)
    fail(
      `Could not create and publish the private repository. ${created.error}`,
    );
}

console.log(
  `Published reviewed commit ${commit.output.slice(0, 12)} to https://github.com/${repository}`,
);
