export default function Page() {
  // Serve your existing UI as a static HTML app inside an iframe.
  // This avoids converting the whole UI to React.
  return (
    <iframe
      src="/index.html"
      title="Dafitech Grade 12 Exams"
      style={{ width: '100%', height: '100vh', border: '0' }}
    />
  );
}

