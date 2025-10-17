export interface YoutrackIssue {
  gh_id: string;
  title: string;
  description: string;
  assignees: { id: string }[];
  tags: string[];
  status: string;
}
