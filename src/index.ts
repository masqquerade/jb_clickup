import dotenv from "dotenv";
import GithubAPI from "./api/github.ts";
import TurndownService from "turndown";
import express from "express";
import YoutrackAPI from "./api/youtrack.ts";
import type { Tag } from "./interfaces/Tag.ts";
import type { User } from "./interfaces/User.ts";
import type { YoutrackIssue } from "./interfaces/YoutrackIssue.ts";
dotenv.config();

const ghApi = new GithubAPI(process.env.GITHUB_TOKEN);
const ytApi = new YoutrackAPI();

export const BASE_URL = process.env.BASE_URL;
const PROJECT_NAME = process.env.PROJECT_NAME;

export const urls = {
  GET_PROJECT_DATA_URL: `${BASE_URL}/api/admin/projects?fields=id,name,shortName&query=${PROJECT_NAME}`,
  CREATE_CUSTOM_FIELD: `${BASE_URL}/api/admin/customFieldSettings/customFields?fields=id`,
  GET_USERS_LIST_URL: `${BASE_URL}/api/users?fields=id,name,email`,
  ISSUES_URL: `${BASE_URL}/api/issues`,
  GET_GROUPS_INFO_URL: `${BASE_URL}/api/groups?fields=id,name&query`,
  CREATE_TAG_URL: `${BASE_URL}/api/tags?fields=id,name,owner(id,name),visibleFor(id,name),updateableBy(id,name)`,
  GET_PROJECTS_URL: `${BASE_URL}/api/admin/projects?fields=id,name`,
  ATTACH_CUSTOM_FIELD_URL: `${BASE_URL}/api/admin/projects`,
};

const GITHUB_CONNECTOR_FIELD_NAME = "GitHub Key";

const app = express();

// Connect to GitHub webhook to get all information about updates
app.post(
  "/webhook",
  express.json({ type: "application/json" }),
  async (req, res) => {
    res.status(202).send("Accepted");

    const users: User[] = await ytApi.getUsers();
    const payload = JSON.parse(req.body.payload);
    const action = payload.action;
    const key = `${process.env.GH_NAME}/${process.env.REPO_NAME}#${payload.issue.number}`;
    const groups = await ytApi.getGroups();
    const project = (await ytApi.getProject())[0];

    switch (action) {
      case "opened":
        await createIssues(project, groups, [payload.issue]);
        break;

      case "closed":
        await ytApi.updateCustomField(key, GITHUB_CONNECTOR_FIELD_NAME, [
          {
            name: "State",
            $type: "SingleEnumIssueCustomField",
            value: {
              name: "Done",
            },
          },
        ]);
        break;

      case "deleted":
        await ytApi.deleteIssue(key, GITHUB_CONNECTOR_FIELD_NAME);
        break;

      case "edited":
        const update = {
          summary: null,
          description: null,
        };

        update.summary = payload.issue.title;
        update.description = payload.issue.body;

        await ytApi.updateIssue(key, GITHUB_CONNECTOR_FIELD_NAME, update);
        break;

      case "reopened":
        await ytApi.updateCustomField(key, GITHUB_CONNECTOR_FIELD_NAME, [
          {
            name: "State",
            $type: "SingleEnumIssueCustomField",
            value: {
              name: "Open",
            },
          },
        ]);
        break;

      case "assigned":
      case "unassigned":
        const ids = [];

        for (const assignee of payload.issue.assignees) {
          const id = await canAssociateAssignee(assignee, users);
          if (id) {
            ids.push({ id });
          }
        }

        await ytApi.updateCustomField(key, GITHUB_CONNECTOR_FIELD_NAME, [
          {
            $type: "MultiUserIssueCustomField",
            name: "Assignees",
            value: ids,
          },
        ]);

        break;

      case "labeled": {
        const labelName = payload.label.name;
        const id = await ytApi.getIssueIdByKey(
          key,
          GITHUB_CONNECTOR_FIELD_NAME
        );
        const tag = await ytApi.createTagAndAssignAll(labelName, groups, id);
        await ytApi.assignTag(id, tag.id);
        break;
      }

      case "unlabeled": {
        const labelName = payload.label.name;
        const existingTags: Tag[] = await ytApi.getIssueTags(
          key,
          GITHUB_CONNECTOR_FIELD_NAME
        );

        const id = existingTags.find((t) => t.name === labelName)?.id;
        if (id) {
          ytApi.removeTagById(key, GITHUB_CONNECTOR_FIELD_NAME, id);
        }

        break;
      }

      default:
        break;
    }
  }
);

app.listen(process.env.SERVER_PORT, () => {
  console.log("server started");
});

const turndownService = new TurndownService();

const canAssociateAssignee = async (assignee: any, users: User[]) => {
  const id = assignee.id;
  const ghUser = await ghApi.getUser(id);
  const email = ghUser.email;
  const name = ghUser.name;

  if (email) {
    const index = users.findIndex((u) => u.email === email);
    return users[index].id;
  }

  if (name) {
    const index = users.findIndex((u) => u.name === name);
    return users[index].id;
  }

  return null;
};

const createIssues = async (project: any, groups: any[], ghIssues: any[]) => {
  const users: User[] = await ytApi.getUsers();
  const youtrackIssues: YoutrackIssue[] = [];

  for (const issue of ghIssues) {
    const ytIssue: YoutrackIssue = {
      gh_id: `${process.env.GH_NAME}/${process.env.REPO_NAME}#${issue.number}`,
      title: "",
      description: "",
      assignees: [],
      tags: [],
      status: "Open",
    };

    const alreadyExists = await ytApi.issueAlreadyExists(
      process.env.PROJECT_NAME!,
      ytIssue.gh_id,
      GITHUB_CONNECTOR_FIELD_NAME
    );
    if (alreadyExists) {
      continue;
    }

    const body = issue.body_html ? issue.body_html : issue.body;

    if (body) {
      const markdown = turndownService.turndown(body);

      ytIssue.description = markdown;
    }
    // console.log(issue.labels)
    for (const label of issue.labels) {
      ytIssue.tags.push(label.name);
    }

    if (issue.state == "closed") {
      ytIssue.status = "Done";
    }
    ytIssue.title = issue.title;

    for (const assignee of issue.assignees) {
      const id = await canAssociateAssignee(assignee, users);
      if (id) {
        ytIssue.assignees.push({
          id,
        });
      }
    }

    youtrackIssues.push(ytIssue);
  }

  for (const ytIssue of youtrackIssues) {
    const issue = await ytApi.createIssue(
      project.id,
      ytIssue.title,
      ytIssue.description,
      GITHUB_CONNECTOR_FIELD_NAME,
      ytIssue.gh_id,
      ytIssue.status,
      ytIssue.assignees
    );

    const issId = issue.id;

    for (const tagName of ytIssue.tags) {
      const tag = await ytApi.createTagAndAssignAll(tagName, groups, issId);
      await ytApi.assignTag(issId, tag.id);
    }
  }
};

const retrieveIssues = async () => {
  const ghIssues: any[] | null = await ghApi.getIssues(
    process.env.GH_NAME,
    process.env.REPO_NAME
  );
  if (!ghIssues) return [];
  const groups = await ytApi.getGroups();
  const project = (await ytApi.getProject())[0];

  const fieldId = await ytApi.createCustomFieldAndAttach(
    {
      type: "SimpleProjectCustomField",
      name: GITHUB_CONNECTOR_FIELD_NAME,
      fieldType: {
        id: "string",
      },
      isAutoAttached: false,
    },
    project.id,
    groups
  );

  const multiAssigneeField = await ytApi.createCustomFieldAndAttach(
    {
      type: "UserProjectCustomField",
      name: "Assignees",
      fieldType: {
        id: "user[*]",
      },
      isAutoAttached: false,
    },
    project.id,
    groups
  );

  await createIssues(project, groups, ghIssues);
};

// Initial issues fetch
await retrieveIssues();
