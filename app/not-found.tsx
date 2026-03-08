export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh", background: "var(--void)", color: "var(--acid)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-mono), monospace", textTransform: "uppercase"
    }}>
      <h2>404 - Not Found</h2>
    </div>
  );
}
