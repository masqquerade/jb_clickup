# Integration of YouTrack issues with GitHub | JetBrains internship test task
This is my solution for the **Import from ClickUp to YouTrack** test task. This tool imports issues from GitHub to YouTrack and synchronizes further changes.

## Video demo:


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

### 4. Start the tool in developer mode
`npm run dev`
