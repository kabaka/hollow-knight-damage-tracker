import type { PropsWithChildren, ReactNode } from 'react';

export type PageSection = {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly content: ReactNode;
};

export type PageLayoutProps = PropsWithChildren<{
  readonly sections: readonly PageSection[];
}>;

export function PageLayout({ children, sections }: PageLayoutProps) {
  return (
    <div className="page">
      <header className="page__header">{children}</header>
      <main className="page__content" aria-live="polite">
        {sections.map((section) => (
          <section key={section.id} aria-labelledby={`${section.id}-title`}>
            <div className="section">
              <div className="section__header">
                <h2 id={`${section.id}-title`} className="section__title">
                  {section.title}
                </h2>
                {section.description ? (
                  <p className="section__description">{section.description}</p>
                ) : null}
              </div>
              <div className="section__body">{section.content}</div>
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
