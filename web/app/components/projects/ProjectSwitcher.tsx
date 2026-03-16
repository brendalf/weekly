"use client";

import { useState } from "react";
import { House, Plus, Gear } from "@gravity-ui/icons";
import { useProjectStore, projectStore } from "../../stores/project";
import { ProjectSettingsModal } from "./ProjectSettingsModal";
import { CreateProjectModal } from "./CreateProjectModal";

export function ProjectSwitcher() {
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;
  const multiProject = projects.length > 1;

  // Label: active project name, or "All Projects" in base view
  const buttonLabel = activeProject?.name ?? "All Projects";
  // House icon only in the button when showing "All Projects"
  const showHouseIconInButton = activeProjectId === null;

  function handleNewProject() {
    setDropdownOpen(false);
    setCreateOpen(true);
  }

  return (
    <div className="relative inline-flex items-center gap-2">
      <button
        onClick={() => setDropdownOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-purple-500 bg-surface px-3 py-1 text-xs font-medium text-primary hover:bg-foreground/5 transition-colors cursor-pointer"
      >
        {showHouseIconInButton && <House width={12} height={12} />}
        {buttonLabel}
      </button>

      {activeProjectId && activeProject && (
        <button
          onClick={() => setSettingsOpen(true)}
          className="cursor-pointer text-foreground/40 hover:text-foreground/70 transition-colors"
          aria-label="Project settings"
        >
          <Gear width={14} height={14} />
        </button>
      )}

      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute left-0 top-full z-20 mt-1 min-w-44 rounded-xl border border-foreground/10 bg-surface p-1 shadow-lg">
            {/* "All Projects" only shown when user has more than one project */}
            {multiProject && (
              <button
                onClick={() => {
                  projectStore.setActiveProject(null);
                  setDropdownOpen(false);
                }}
                className={[
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-foreground/5 transition-colors cursor-pointer",
                  activeProjectId === null
                    ? "text-purple-500 font-medium"
                    : "text-foreground",
                ].join(" ")}
              >
                <House width={12} height={12} />
                All Projects
              </button>
            )}

            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  projectStore.setActiveProject(project.id);
                  setDropdownOpen(false);
                }}
                className={[
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-foreground/5 transition-colors cursor-pointer",
                  activeProjectId === project.id
                    ? "text-purple-500 font-medium"
                    : "text-foreground",
                ].join(" ")}
              >
                {project.name}
              </button>
            ))}

            <div className="my-1 border-t border-foreground/10" />

            <button
              onClick={handleNewProject}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-foreground/60 hover:bg-foreground/5 transition-colors cursor-pointer"
            >
              <Plus width={12} height={12} />
              New project
            </button>
          </div>
        </>
      )}

      {activeProjectId && activeProject && (
        <ProjectSettingsModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          project={activeProject}
        />
      )}

      <CreateProjectModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
