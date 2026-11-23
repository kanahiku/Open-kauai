/**
 * Publish validation helpers for Sanity.
 * Block publishing if required fields are missing.
 */
import { definePlugin } from 'sanity';

/**
 * Custom validation for documents.
 * Use in defineField validation rules.
 */
export const requiredForPublish = (message = 'Required before publishing') => {
  return (Rule: any) => Rule.custom((value: any, context: any) => {
    // Allow drafts without the field
    if (context.document?._id?.startsWith('drafts.')) {
      return true;
    }
    // Require for published docs
    if (!value) {
      return message;
    }
    return true;
  });
};

/**
 * Validate slug is set before publishing.
 */
export const slugRequired = () => {
  return (Rule: any) => Rule.custom((slug: { current?: string } | undefined, context: any) => {
    if (context.document?._id?.startsWith('drafts.')) {
      return true;
    }
    if (!slug?.current) {
      return 'Slug is required before publishing.';
    }
    return true;
  });
};

/**
 * Validate title is set with minimum length.
 */
export const titleRequired = (minLength = 3) => {
  return (Rule: any) => Rule.custom((title: string | undefined, context: any) => {
    if (context.document?._id?.startsWith('drafts.')) {
      return true;
    }
    if (!title || title.length < minLength) {
      return "Title is required (min " + minLength + " characters) before publishing.";
    }
    return true;
  });
};

/**
 * Validate SEO fields are present before publishing.
 */
export const seoFieldsRequired = () => {
  return (Rule: any) => Rule.custom((seo: any, context: any) => {
    if (context.document?._id?.startsWith('drafts.')) {
      return true;
    }
    const errors: string[] = [];
    if (!seo?.title) errors.push('SEO title');
    if (!seo?.description) errors.push('SEO description');
    
    if (errors.length > 0) {
      return 'Missing: ' + errors.join(', ');
    }
    return true;
  });
};
