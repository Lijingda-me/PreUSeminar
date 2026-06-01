import React, { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="grid min-h-screen place-items-center px-6 text-center">
          <section className="rounded-[32px] bg-white/80 p-6 shadow-soft">
            <h1 className="text-4xl font-black text-brand-text">BridgeUp</h1>
            <p className="mt-3 font-semibold text-brand-muted">The app had trouble starting. Refresh the page to reload your session.</p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
