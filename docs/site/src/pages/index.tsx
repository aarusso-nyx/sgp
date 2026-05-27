import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs/eng">
            Engineering
          </Link>
          <Link className="button button--secondary button--lg" to="/docs/gov">
            Governance
          </Link>
          <Link className="button button--secondary button--lg" to="/docs/user">
            Operators
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="SGP documentation for engineering authority, governance evidence, operator workflows, and legacy references."
    >
      <HomepageHeader />
      <main>
        <section className={styles.features}>
          <div className="container">
            <p>
              SGP is a fresh municipal people-management implementation with a folia-first payroll
              engine, tenant isolation, audit posture, and regulatory integration boundaries.
            </p>
            <p>
              Start with <Link to="/docs/eng">engineering authority</Link> for product behavior,{' '}
              <Link to="/docs/gov">governance</Link> for retained evidence and gates, or{' '}
              <Link to="/docs/user">operator docs</Link> for local setup and runtime guidance.
            </p>
          </div>
        </section>
      </main>
    </Layout>
  );
}
