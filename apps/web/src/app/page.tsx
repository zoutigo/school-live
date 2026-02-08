export default function HomePage() {
  return (
    <main style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <h1>School Live</h1>
      <p>Selectionne un portail ecole:</p>
      <ul>
        <li>
          <a href="/schools/demo">Portail demo</a>
        </li>
      </ul>
    </main>
  );
}
