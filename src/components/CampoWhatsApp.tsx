import { useEffect, useRef, useState } from "react";
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/min";
import { CampoSelect, CampoTexto } from "./Campo";

const nomes = new Intl.DisplayNames(["pt-BR"], { type: "region" });
const paises = getCountries().sort((a,b) => a === "BR" ? -1 : b === "BR" ? 1 : (nomes.of(a) || a).localeCompare(nomes.of(b) || b, "pt-BR"));
function separar(valor: string) {
  const n = parsePhoneNumberFromString(valor);
  return { pais: n?.country ?? n?.getPossibleCountries()[0] ?? "BR" as CountryCode, numero: n?.nationalNumber?.toString() ?? valor.replace(/^\+55/, "") };
}

export function CampoWhatsApp({ value, onChange, erro }: { value: string; onChange: (valor: string) => void; erro?: string }) {
  const [dados, setDados] = useState(() => separar(value));
  const emitido = useRef(value);
  useEffect(() => { if (value !== emitido.current) { setDados(separar(value)); emitido.current = value; } }, [value]);
  function mudar(numero: string, pais: CountryCode) {
    const internacional = numero.trim().startsWith("+") ? parsePhoneNumberFromString(numero) : null;
    const paisColado = internacional?.country ?? internacional?.getPossibleCountries()[0];
    if (internacional && paisColado) { pais = paisColado; numero = internacional.nationalNumber; }
    const digitos = numero.replace(/\D/g, "");
    const analisado = digitos ? parsePhoneNumberFromString(numero, pais) : null;
    const valor = !digitos ? "" : analisado?.isPossible() ? analisado.number.toString() : `+${getCountryCallingCode(pais)}${digitos}`;
    setDados({pais,numero}); emitido.current = valor; onChange(valor);
  }
  return <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
    <CampoSelect rotulo="País do WhatsApp" value={dados.pais} onChange={e=>mudar(dados.numero,e.target.value as CountryCode)} opcoes={paises.map(p=>({valor:p,rotulo:`${nomes.of(p) || p} (+${getCountryCallingCode(p)})`}))} />
    <CampoTexto rotulo="WhatsApp" type="tel" inputMode="tel" autoComplete="tel-national" placeholder={dados.pais === "BR" ? "(11) 99999-9999" : "DDD e número"} ajuda="Informe o DDD e o número. O código do país é incluído automaticamente." value={dados.numero} maxLength={30} erro={erro} onChange={e=>mudar(e.target.value,dados.pais)} />
  </div>;
}
