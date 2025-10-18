# Integration of YouTrack issues with GitHub | JetBrains internship test task
This is my solution for the **Import from ClickUp to YouTrack** test task. This tool imports issues from GitHub to YouTrack and synchronizes further changes.

### Video demo:

# Overview
This tool synchonizes GitHub issues with YouTrack using a webhook that tracks changes in real time.
On the initial run, it imports all unique issues from GitHub into YouTrack.
If an issue already exists in YouTrack, it will be skipped.

To link issues between two systems, the tool adds a custom field called `GitHub Key` to each imported issue. The value if this field follow the format: `<username>/<repository-name>#<issue-number>`

**Assignees**

GitHub allows multiple collaborators to be assigned to the same issue, while YouTrack does not directly support this behavior. To replicate it, the tool uses a **multi-value custom field** to store all assigned users. It attempts to match GitHub users to existing YouTrack accounts based on their **email adresses** or **names**.

**Labels**

GitHub labels are represented as **tags** in YouTrack. During import and synchronization, all labels associated with an issue are automatically mirrored as YouTrack tags.

**Tracked Changes**

The tool listens for and processes the following events:

- **Issue opened / closed / reopened**
- **Issue deleted**
- **Issue edited** (title or description changes)
- **Collaborator(s) assigned or unassigned**
- **Label(s) added or removed***

# Getting started
### 1. Clone the repository
`git clone https://github.com/masqquerade/jb_clickup.git`

`cd jb_clickup`

### 2. Install dependencies
`npm i`

### 3. Setup environment
#### 3.1 Create .env file
`touch .env`

#### 3.2 Setup .env file:
- `GITHUB_TOKEN` - Your GitHub API Token
- `BASE_URL` - Base URL of your YouTrack instance (e.g. https://testimg.youtrack.cloud)
- `PROJECT_NAME` - Name of your YouTrack project
- `YT_TOKEN` - Your YouTrack token. You must be an admin.
- `GH_NAME` - GitHub login that hosts your repository
- `REPO_NAME` - The name of repository
- `SERVER_PORT` - Server port (e.g. 3000)

### 4. Setup smee.io
To expose local server I used [smee.io](https://smee.io/). 
GitHub has detailed step-by-step guide for it: 

### 4. Run the proxy & Start the tool in developer mode
`smee --url <your-smee-url> --path /webhook --port <port>`
`npm run dev`
