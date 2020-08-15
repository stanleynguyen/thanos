const core = require('@actions/core');
const github = require('@actions/github');

const octokit = github.getOctokit(core.getInput('github-token'));

async function run() {
  const repoInfo = github.context.repo;
  const headCommit = await octokit.git.getCommit({
    ...repoInfo,
    commit_sha: github.context.sha,
  });
  const tree = await octokit.git.getTree({
    ...repoInfo,
    tree_sha: headCommit.data.tree.sha,
    recursive: 1,
  });
  const newTree = await snap(repoInfo, tree.data.tree);
  const newCommit = await octokit.git.createCommit({
    ...repoInfo,
    tree: newTree.data.sha,
    message: 'Restore perfect balance ✨',
    parents: [headCommit.data.sha],
  });
  await octokit.git.updateRef({
    ...repoInfo,
    ref: github.context.ref.substr(5), // removing refs/ from context's ref string
    sha: newCommit.data.sha,
  });
}

async function snap(repoInfo, objects) {
  const theLuckyHalf = [];
  for (let object of objects) {
    if (object.type == 'tree' && object.path != '.github') {
      const innerTree = await octokit.git.getTree({
        ...repoInfo,
        tree_sha: object.sha,
      });
      const newTree = await snap(repoInfo, innerTree.data.tree);
      object.sha = newTree.data.sha;
      theLuckyHalf.push(object);
    } else if (object.type == 'blob') {
      if (Math.random() > 0.5) {
        theLuckyHalf.push(object);
      }
    }
  }
  const noOneSurvived = theLuckyHalf.length === 0;
  if (noOneSurvived) {
    theLuckyHalf.push(objects[0]);
  }

  return octokit.git.createTree({ ...repoInfo, tree: theLuckyHalf });
}

run();
