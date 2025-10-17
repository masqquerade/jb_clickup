import AlreadyExistsException from "../exceptions/alreadyExistsException.ts";
import { urls, BASE_URL } from "../index.ts";
import type { Field } from "../interfaces/Field.ts";
import type { TagCreation } from "../interfaces/TagCreation.ts";

class YoutrackAPI {
  constructor() {}

  async removeTagById(ghKey: string, keyName: string, tagId: string) {
    const id = await this.getIssueIdByKey(ghKey, keyName);

    await fetch(urls.ISSUES_URL + `/${id}/tags/${tagId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${process.env.YT_TOKEN}`,
      },
    });
  }

  async getIssueIdByKey(ghKey: string, keyName: string) {
    const findIssueRes = await fetch(
      urls.ISSUES_URL +
        `?query=has:%20{${encodeURIComponent(
          keyName
        )}}%20and%20"${encodeURIComponent(ghKey)}"&fields=id`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.YT_TOKEN}`,
        },
      }
    );

    const json = (await findIssueRes.json())[0];
    const id = json.id;

    return id;
  }

  async getIssueTags(ghKey: string, keyName: string) {
    const id = await this.getIssueIdByKey(ghKey, keyName);

    if (!id) {
      throw new Error("Unable to get id of an issue.");
    }

    const res = await fetch(urls.ISSUES_URL + `/${id}/tags?fields=name,id`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.YT_TOKEN}`,
      },
    });

    return await res.json();
  }

  async updateIssue(ghKey: string, keyName: string, update: any) {
    const id = await this.getIssueIdByKey(ghKey, keyName);

    if (!id) {
      throw new Error("Unable to get id of an issue.");
    }

    const updateIssueRes = await fetch(urls.ISSUES_URL + `/${id}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.YT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(update),
    });
  }

  async deleteIssue(ghKey: string, keyName: string) {
    const id = await this.getIssueIdByKey(ghKey, keyName);

    if (!id) {
      throw new Error("Unable to get id of an issue.");
    }

    const deleteIssueRes = await fetch(urls.ISSUES_URL + `/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${process.env.YT_TOKEN}`,
      },
    });
  }

  async updateCustomField(ghKey: string, keyName: string, fields: any[]) {
    const id = await this.getIssueIdByKey(ghKey, keyName);

    if (!id) {
      throw new Error("Unable to get id of an issue.");
    }

    const updateFieldsRes = await fetch(urls.ISSUES_URL + `/${id}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.YT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customFields: [...fields],
      }),
    });
  }

  async getUsers() {
    const res = await fetch(urls.GET_USERS_LIST_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.YT_TOKEN}`,
      },
    });

    if (!res.ok) {
      throw new Error("Could not get users.");
    }

    const json = await res.json();
    return json;
  }

  async getGroups() {
    const res = await fetch(urls.GET_GROUPS_INFO_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.YT_TOKEN}`,
      },
    });

    const json = await res.json();
    return json;
  }

  private async createTag(name: string) {
    const res = await fetch(urls.CREATE_TAG_URL, {
      method: "POST",
      body: JSON.stringify({
        name: name,
      }),
      headers: {
        Authorization: `Bearer ${process.env.YT_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const lookupRes = await fetch(
        urls.CREATE_TAG_URL + `&query=${encodeURIComponent(name)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${process.env.YT_TOKEN}`,
          },
        }
      );

      const tag = (await lookupRes.json())[0] || null;
      if (!tag) {
        throw new Error(
          `Could not lookup tag: ${lookupRes.status} ${lookupRes.statusText}`
        );
      }

      return tag;
    }

    return await res.json();
  }

  private async updateTag(groupId: string, tagId: string) {
    const res = await fetch(
      `${BASE_URL}/api/tags/${tagId}?fields=id,name,visibleFor(id,name),updateableBy(id,name)`,
      {
        method: "POST",
        body: JSON.stringify({
          visibleFor: {
            id: groupId,
          },
        }),
        headers: {
          Authorization: `Bearer ${process.env.YT_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      throw new Error("Could not update a tag.");
    }
  }

  async assignTag(issueId: string, tagId: string) {
    const res = await fetch(
      urls.ISSUES_URL + `/${issueId}/tags?fields=id,name`,
      {
        method: "POST",
        body: JSON.stringify({
          id: tagId,
        }),
        headers: {
          Authorization: `Bearer ${process.env.YT_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      throw new Error("Could not update a tag.");
    }
  }

  async createTagAndAssignAll(name: string, groups: any[], issueId: string) {
    const allUsersGroup =
      groups.find((g) => g.$type === "AllUsersGroup") ||
      groups.find((g) => g.name.toLowerCase() === "all users");
    if (!allUsersGroup) throw new Error("All users group does not exist.");

    const tag: TagCreation = await this.createTag(name);
    try {
      await this.updateTag(allUsersGroup.id, tag.id);
    } catch (error) {
      throw error;
    }

    return tag;
  }

  async createIssue(
    projectId: string,
    summary: string,
    description: string,
    ghIdFieldName: string,
    ghId: string,
    status: string,
    assignees: { id: string }[]
  ) {
    const res = await fetch(urls.ISSUES_URL + `?fields=id`, {
      method: "POST",
      body: JSON.stringify({
        project: {
          id: projectId,
        },
        summary,
        description,
        customFields: [
          {
            $type: "SimpleIssueCustomField",
            name: ghIdFieldName,
            value: ghId,
          },
          {
            $type: "StateIssueCustomField",
            name: "State",
            value: {
              name: status,
            },
          },
          {
            $type: "MultiUserIssueCustomField",
            name: "Assignees",
            value: assignees,
          },
        ],
      }),
      headers: {
        Authorization: `Bearer ${process.env.YT_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    return await res.json();
  }

  async getProject() {
    const res = await fetch(
      urls.GET_PROJECTS_URL + `&query=${process.env.YT_PROJECT_NAME}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.YT_TOKEN}`,
        },
      }
    );

    return await res.json();
  }

  async createCustomFieldAndAttach(
    field: Field,
    projectId: string,
    groups: any[]
  ) {
    const createRes = await fetch(urls.CREATE_CUSTOM_FIELD, {
      method: "POST",
      body: JSON.stringify(field),
      headers: {
        Authorization: `Bearer ${process.env.YT_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    let customFieldId: string | null = null;
    if (createRes.ok) {
      const created = await createRes.json();

      customFieldId = created.id;
    } else if (createRes.status == 400) {
      const lookupRes = await fetch(
        urls.CREATE_CUSTOM_FIELD +
          `,name,fieldType(id)&query=${encodeURIComponent(field.name)}`,
        { headers: { Authorization: `Bearer ${process.env.YT_TOKEN}` } }
      );
      const list = await lookupRes.json();
      const hit = (list || []).find(
        (f: any) =>
          f.name === field.name && f.fieldType?.id === field.fieldType.id
      );
      if (!hit)
        throw new Error("Custom field not found and can not be created");
      customFieldId = hit.id;
    } else {
      throw new Error(
        `Creationg of custom field failed: ${createRes.status} ${createRes.statusText}`
      );
    }

    const allUsersGroup =
      groups.find((g) => g.$type === "AllUsersGroup") ||
      groups.find((g) => g.name.toLowerCase() === "all users");
    if (!allUsersGroup) throw new Error("All users group does not exist.");

    const attachedFieldsRes = await fetch(
      urls.ATTACH_CUSTOM_FIELD_URL +
        `/${projectId}/customFields?fields=id,field(id,name)`,
      { headers: { Authorization: `Bearer ${process.env.YT_TOKEN}` } }
    );
    const attached = await attachedFieldsRes.json();
    const isAlreadyAttached = attached.find(
      (f: any) => f.field?.id === customFieldId
    );

    if (!isAlreadyAttached) {
      const attachRes = await fetch(
        urls.ATTACH_CUSTOM_FIELD_URL +
          `/${projectId}/customFields?fields=id,field(id,name),readers(id,name)`,
        {
          method: "POST",
          body: JSON.stringify({
            $type: field.type,
            field: {
              id: customFieldId,
            },
            canBeEmpty: true,
          }),

          headers: {
            Authorization: `Bearer ${process.env.YT_TOKEN}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (!attachRes.ok) {
        throw new Error(
          `Could not attach custom field: ${attachRes.status} ${attachRes.statusText}`
        );
      }
    }

    return customFieldId;
  }

  async issueAlreadyExists(project: string, key: string, keyName: string) {
    const url = new URL(
      urls.ISSUES_URL +
        `?query=has:%20{${encodeURIComponent(
          keyName
        )}}%20and%20"${encodeURIComponent(key)}"&fields=id,summary`
    );

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${process.env.YT_TOKEN}`,
      },
    });

    const arr = await res.json();
    if (arr.length === 0) {
      return false;
    }

    return true;
  }
}

export default YoutrackAPI;
