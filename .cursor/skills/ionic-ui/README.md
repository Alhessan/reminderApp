# Ionic UI Skill – How to Use

This skill is applied by Cursor when the conversation matches its **description** (Ionic, ion-* components, theming, Capacitor, etc.). You can use it with or without Speckit.

---

## Using **without** Speckit

- **Mention the stack**: In chat, say things like “build this page in Ionic”, “style this with Ionic components”, or “use Ionic theming”. The agent will match the skill and apply it.
- **Reference the skill**: If your Cursor setup supports it, you can @-mention the skill file (e.g. `@.cursor/skills/ionic-ui/SKILL.md`) so the agent loads it for that turn.
- **Project scope**: With the skill in `.cursor/skills/ionic-ui/`, it’s available in this repo; the agent will consider it when the request is about Ionic UI.

---

## Using **with** Speckit

- **Implement step**: When you run **Speckit Implement** (e.g. `/speckit.implement` or the implement command), the agent already has access to project skills. If the **plan** or **tasks** involve Ionic UI (e.g. “Task list page using Ionic components”), the agent will match this skill and follow it during implementation.
- **Plan phase**: In **plan.md** (or tech context), list “Ionic” / “Ionic UI” in the tech stack or UI section. That keeps implementation aligned with Ionic and makes the skill more likely to be applied.
- **Extra hint**: In the implement command arguments, you can add: “Use Ionic UI components and theming per project skill.” That explicitly asks the agent to apply this skill.

No Speckit config change is required; skills are chosen by description match. Making Ionic visible in the plan and tasks is enough for the implement step to use this skill.
