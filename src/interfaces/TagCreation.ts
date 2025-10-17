export interface TagCreation {
  owner: {
    name: string;
    id: string;
    $type: string;
  };
  visibleFor: null | string[];
  updateableBy: null | string[];
  name: string;
  id: string;
  $type: string;
}

