import { useState, type FC } from "react";

import { SceneGroup } from "./mesh";

import type { SceneObject } from "./mesh";

const QuadEditor: FC = () => {
  return <p>Quad Editor</p>;
};

export const SceneEditor: FC = () => {
  const [sceneRoot, setSceneRoot] = useState<SceneObject[]>([]);

  return sceneRoot.map((sceneObject) => {
    return sceneObject.render();
  });
};
