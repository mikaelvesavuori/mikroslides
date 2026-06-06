import { createBlankSlide, type MikroSlideRecord, type SlideElement } from "../index.js";
import { createId } from "../shared/index.js";
import { escapeAttribute, escapeHtml } from "./htmlEscape.js";

export type UserTemplate = {
  createdAt: string;
  id: string;
  name: string;
  slide: MikroSlideRecord;
};

export const userTemplatesStorageKey = "mikroslides.userTemplates";
export const maxUserTemplates = 24;

export function createUserTemplateFromSlide(
  slide: MikroSlideRecord,
  name: string,
  now = new Date().toISOString(),
  createTemplateId = () => createId("template"),
) {
  return {
    createdAt: now,
    id: createTemplateId(),
    name: name.trim() || slide.title || "Untitled template",
    slide: cloneSlideForTemplate(slide),
  };
}

export function prependUserTemplate(templates: UserTemplate[], template: UserTemplate) {
  return [template, ...templates].slice(0, maxUserTemplates);
}

export function normalizeUserTemplate(value: unknown): UserTemplate | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<UserTemplate>;
  if (typeof candidate.id !== "string" || typeof candidate.name !== "string" || !candidate.slide) {
    return null;
  }

  return {
    createdAt:
      typeof candidate.createdAt === "string" ? candidate.createdAt : new Date().toISOString(),
    id: candidate.id,
    name: candidate.name.trim() || "Untitled template",
    slide: createBlankSlide(candidate.slide),
  };
}

export function parseUserTemplates(value: string | null) {
  if (!value) {
    return [];
  }

  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map(normalizeUserTemplate)
    .filter((template): template is UserTemplate => Boolean(template))
    .slice(0, maxUserTemplates);
}

export function renderUserTemplateOptions(templates: UserTemplate[]) {
  return templates
    .map(
      (template) =>
        `<option value="custom:${escapeAttribute(template.id)}">${escapeHtml(template.name)}</option>`,
    )
    .join("");
}

export function createUserTemplateSlide(
  templates: UserTemplate[],
  templateId: string,
  base: MikroSlideRecord,
  createElementId = () => createId("el"),
) {
  const template = templates.find((item) => item.id === templateId);
  if (!template) {
    return null;
  }

  return {
    ...base,
    background: template.slide.background,
    elements: template.slide.elements.map((element) =>
      cloneElementForInsertion(element, createElementId),
    ),
    layout: template.slide.layout,
    title: template.slide.title,
    transition: template.slide.transition,
  };
}

function cloneSlideForTemplate(slide: MikroSlideRecord): MikroSlideRecord {
  return {
    ...structuredClone(slide),
    elements: slide.elements.map((element) => structuredClone(element) as SlideElement),
    id: createId("template_slide"),
  };
}

function cloneElementForInsertion(element: SlideElement, createElementId: () => string) {
  return {
    ...structuredClone(element),
    id: createElementId(),
  } as SlideElement;
}
