import { describe, expect, it } from 'vitest';
import {
  bookingUrlSchema,
  experienceContentSchema,
  experienceSchemas,
  operatorFiltersSchema,
} from '../src/lib/experiences/validation';
const content = {
  titles: { es: 'Experiencia de prueba', en: 'Test experience', pt: 'Experiência de teste' },
  descriptions: {
    es: 'Contenido aislado para verificar el esquema.',
    en: 'Isolated content for schema validation.',
    pt: 'Conteúdo isolado para verificar o esquema.',
  },
  booking_url: '',
};
describe('destination experience validation', () => {
  it('requires all translations and meaningful bounded content', () => {
    expect(experienceContentSchema.parse(content).booking_url).toBeNull();
    for (const changed of [
      { titles: { es: 'Title' } },
      { titles: { ...content.titles, en: 'x' } },
      { descriptions: { ...content.descriptions, pt: 'short' } },
      { titles: { ...content.titles, en: 'x'.repeat(121) } },
    ])
      expect(experienceContentSchema.safeParse({ ...content, ...changed }).success).toBe(false);
  });
  it('normalizes safe provider links and rejects active schemes, credentials and local addresses', () => {
    expect(bookingUrlSchema.parse('https://example.com')).toBe('https://example.com/');
    for (const link of [
      'http://example.com/',
      'javascript:alert(1)',
      'https://user:pass@example.com/',
      'https://localhost/',
      'https://127.0.0.1/',
      'https://example.com/#token',
      'https://example.com:444/',
    ])
      expect(bookingUrlSchema.safeParse(link).success).toBe(false);
  });
  it('requires explicit publish confirmation and bounded versions/filters', () => {
    const input = {
      experience_id: 'a1000000-0000-4000-8000-000000000001',
      command_id: 'a1000000-0000-4000-8000-000000000002',
      expected_version: 0,
    };
    expect(experienceSchemas.publish.safeParse(input).success).toBe(false);
    expect(experienceSchemas.publish.safeParse({ ...input, confirmed: 'on' }).success).toBe(true);
    expect(operatorFiltersSchema.parse({})).toEqual({ status: 'draft', offset: 0 });
    for (const query of [
      { offset: -1 },
      { offset: 100001 },
      { status: 'deleted' },
      { destination: 'elsewhere' },
    ])
      expect(operatorFiltersSchema.safeParse(query).success).toBe(false);
  });
});
