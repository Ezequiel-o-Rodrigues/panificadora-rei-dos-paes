export const metadata = { title: "Sobre" };

export default function SobrePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="font-display text-5xl font-bold text-ivory-50">
        Nossa <span className="text-gradient-flame">história</span>
      </h1>
      <p className="mt-6 text-lg text-onyx-200">
        A Panificadora Rei dos Pães nasceu do sonho de levar pão fresco e de
        qualidade para o bairro. Em breve contaremos toda a história por aqui.
      </p>
    </div>
  );
}
