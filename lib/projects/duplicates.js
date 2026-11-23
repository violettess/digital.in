function duplicateKey(project) {
  return JSON.stringify([
    project.title.trim().toLocaleLowerCase(),
    project.category || "",
    project.description.trim(),
    Number(project.budget),
    project.deadline,
    project.location || "",
  ]);
}

function publishedTime(project) {
  const timestamp = Date.parse(project.publishedAt || project.createdAt || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function duplicateOpenProjectIds(projects) {
  const groups = new Map();
  for (const project of projects) {
    if (!project.fromApi || project.status !== "terbuka" || project.contractId) continue;
    const key = duplicateKey(project);
    const group = groups.get(key) || [];
    group.push(project);
    groups.set(key, group);
  }

  return [...groups.values()].flatMap((group) => {
    if (group.length < 2) return [];
    const newestFirst = [...group].sort((a, b) => publishedTime(b) - publishedTime(a));
    return newestFirst.slice(1).map((project) => project.id);
  });
}
