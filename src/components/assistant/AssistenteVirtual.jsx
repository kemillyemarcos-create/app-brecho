import { useState } from "react";
import {
  Sparkles,
  Send,
  TrendingUp,
  Radio,
  Users,
  PackageSearch,
  Truck,
} from "lucide-react";
import assistantEngine from "../../assistant/AssistantEngine";
import "./assistant.css";

const sugestoes = [
  {
    titulo: "Vendas hoje",
    descricao: "Consultar faturamento",
    icone: TrendingUp,
    pergunta: "Quanto vendemos hoje?",
  },
  {
    titulo: "Última live",
    descricao: "Resumo da operação",
    icone: Radio,
    pergunta: "Resumo da última live",
  },
  {
    titulo: "Pendências",
    descricao: "Pagamentos em aberto",
    icone: Users,
    pergunta: "Clientes pendentes",
  },
  {
    titulo: "Estoque parado",
    descricao: "Peças antigas",
    icone: PackageSearch,
    pergunta: "Estoque parado",
  },
  {
    titulo: "Expedição",
    descricao: "Envios e separação",
    icone: Truck,
    pergunta: "Abrir expedição",
  },
];

export default function AssistenteVirtual() {
  const [pergunta, setPergunta] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mensagens, setMensagens] = useState([]);

  const temConversa = mensagens.length > 0;

  async function enviarPergunta(textoManual = "") {
    const texto = String(textoManual || pergunta || "").trim();
    if (!texto || carregando) return;

    setPergunta("");
    setCarregando(true);

    setMensagens((prev) => [...prev, { tipo: "usuario", texto }]);

    const resultado = await assistantEngine.executar(texto);

    setMensagens((prev) => [
      ...prev,
      {
        tipo: "assistente",
        texto: resultado?.resposta || "Não consegui responder agora.",
        ok: resultado?.ok,
        skill: resultado?.skill,
      },
    ]);

    setCarregando(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviarPergunta();
    }
  }

  return (
    <div className="assistant-page">
      <header className="assistant-header">
        <div>
          <h1>Boa noite, Marcos 👋</h1>
          <p>Estou pronto para ajudar na gestão do seu brechó.</p>
        </div>

        <div className="assistant-badge">
          <Sparkles size={15} />
          Assistente Virtual
        </div>
      </header>

      {!temConversa && (
        <section className="assistant-welcome">
          <div className="assistant-welcome-content">
            <h2>Perguntas rápidas</h2>
            <p>Clique em um atalho ou escreva sua própria pergunta.</p>
          </div>

          <div className="assistant-quick-grid">
            {sugestoes.map((item) => {
              const Icone = item.icone;

              return (
                <button
                  key={item.titulo}
                  type="button"
                  className="assistant-card"
                  onClick={() => enviarPergunta(item.pergunta)}
                >
                  <div className="assistant-card-icon">
                    <Icone size={18} />
                  </div>

                  <div>
                    <strong>{item.titulo}</strong>
                    <span>{item.descricao}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {temConversa && (
        <section className="assistant-conversation">
          {mensagens.map((msg, index) => {
            const usuario = msg.tipo === "usuario";

            return (
              <div
                key={`${msg.tipo}-${index}`}
                className={`assistant-message-row ${
                  usuario ? "user" : "assistant"
                }`}
              >
                {!usuario && (
                  <div className="assistant-avatar">
                    <Sparkles size={15} />
                  </div>
                )}

                <div
                  className={`assistant-message ${
                    usuario ? "user" : "assistant"
                  }`}
                >
                  {msg.texto}
                </div>
              </div>
            );
          })}

          {carregando && (
            <div className="assistant-thinking">
              <Sparkles size={15} />
              <span>Pensando</span>
              <span className="dots">...</span>
            </div>
          )}
        </section>
      )}

      <form
        className="assistant-input-area"
        onSubmit={(e) => {
          e.preventDefault();
          enviarPergunta();
        }}
      >
        <textarea
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte qualquer coisa sobre seu negócio..."
          rows={1}
        />

        <button type="submit" disabled={carregando || !pergunta.trim()}>
          <Send size={18} />
        </button>
      </form>

      <div className="assistant-footer">
        Enter para enviar • Shift + Enter para nova linha
      </div>
    </div>
  );
}