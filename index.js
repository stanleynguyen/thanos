const core = require('@actions/core');
const github = require('@actions/github');

const octokit = github.getOctokit(core.getInput('github-token'));

async function run() {
  const repoInfo = github.context.repo;
  const latestGeneration = await octokit.git.getCommit({
    ...repoInfo,
    commit_sha: github.context.sha,
  });
  const planet = await octokit.git.getTree({
    ...repoInfo,
    tree_sha: latestGeneration.data.tree.sha,
    recursive: 1,
  });
  const newPlanet = await snap(repoInfo, planet.data.tree);
  const newPopulation = await octokit.git.createCommit({
    ...repoInfo,
    tree: newPlanet.data.sha,
    message: 'Restore perfect balance ✨',
    parents: [latestGeneration.data.sha],
  });
  await octokit.git.updateRef({
    ...repoInfo,
    ref: github.context.ref.substr(5), // removing refs/ from context's ref string
    sha: newPopulation.data.sha,
  });
}

async function snap(repoInfo, citizens) {
  const theLuckyHalf = [];
  for (let citizen of citizens) {
    if (citizen.type == 'tree' && citizen.path != '.github') {
      const city = await octokit.git.getTree({
        ...repoInfo,
        tree_sha: citizen.sha,
      });
      const newCity = await snap(repoInfo, city.data.tree);
      const allSnapped = !newCity;
      if (allSnapped) {
        // if all citizens snapped, city is considerred snapped
        continue;
      }
      citizen.sha = newCity.data.sha;
      theLuckyHalf.push(citizen);
    } else if (citizen.type == 'blob') {
      if (Math.random() > 0.5) {
        theLuckyHalf.push(citizen);
      }
    }
  }
  const noOneSurvived = theLuckyHalf.length === 0;
  if (noOneSurvived) {
    return null;
  }

  return octokit.git.createTree({ ...repoInfo, tree: theLuckyHalf });
}

run();
