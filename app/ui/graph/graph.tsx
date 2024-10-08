"use client";
import git from "isomorphic-git";
import { posix as path } from "path";
import { useEffect, useState } from "react";
import fs from "../../lib/fs/main";
import Chart from "./chart/chart";
import styles from "./graph.module.css";

export default function Graph(props: { update: number }) {
  const [data, setData] = useState<string>("");

  async function generateTree() {
    fs.init();
    if (!(await fs.isFile(path.join(fs.gitWorkingDir, ".git", "HEAD")))) {
      return;
    }
    const logs = await git.log({
      fs: fs.p,
      dir: fs.gitWorkingDir,
    });
    const newData = ["flowchart RL"];
    const commitsAdded = new Set<string>();
    for (const log of logs) {
      if (commitsAdded.has(log.oid)) continue;
      commitsAdded.add(log.oid);
      newData.push(`${log.oid}(${log.oid.substring(0, 6)})`);
      for (const parent of log.commit.parent) {
        newData.push(`${log.oid} --> ${parent}`);
      }
    }
    const branches = await git.listBranches({
      fs: fs.p,
      dir: fs.gitWorkingDir,
    });
    for (const branch of branches) {
      const ref = await git.resolveRef({
        fs: fs.p,
        dir: fs.gitWorkingDir,
        ref: "refs/heads/" + branch,
      });
      newData.push(`branch-${branch}(${branch}) --> ${ref}`);
      if (commitsAdded.has(ref)) continue;
      const logs = await git.log({
        fs: fs.p,
        dir: fs.gitWorkingDir,
        ref: ref,
      });
      for (const log of logs) {
        if (commitsAdded.has(log.oid)) continue;
        commitsAdded.add(log.oid);
        newData.push(`${log.oid}(${log.oid.substring(0, 6)})`);
        for (const parent of log.commit.parent) {
          newData.push(`${log.oid} --> ${parent}`);
        }
      }
    }
    const currBranch = await git.currentBranch({
      fs: fs.p,
      dir: fs.gitWorkingDir,
    });
    if (currBranch) newData.push(`HEAD(HEAD) --> branch-${currBranch}`);
    else {
      const currHead = await git.resolveRef({
        fs: fs.p,
        dir: fs.gitWorkingDir,
        ref: "HEAD",
      });
      newData.push(`HEAD(HEAD) --> ${currHead}`);
    }
    setData(newData.join("\n"));
  }

  useEffect(() => {
    generateTree();
  }, [props.update]);

  return (
    <div className={styles.graph}>
      <Chart data={data} />
    </div>
  );
}
