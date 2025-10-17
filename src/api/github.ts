import { Octokit } from "@octokit/rest";

class GithubAPI {
  client: Octokit;

  constructor(token: string | undefined) {
    this.client = new Octokit({
      auth: token,
    });
  }

  async getIssues(owner: string | undefined, repo: string | undefined) {
    if (!owner || !repo) {
      return null;
    }

    const res = await this.client.paginate(
      this.client.rest.issues.listForRepo,
      {
        owner: owner,
        repo: repo,
        per_page: 100,
        state: "all",
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
          accept: "application/vnd.github.html+json",
        },
      },
      (res) => res.data.filter((i) => !("pull_request" in i))
    );

    return res;
  }

  async getUser(id: number) {
    const res = await this.client.request("GET /user/{account_id}", {
      account_id: id,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    return res.data;
  }
}

export default GithubAPI;
