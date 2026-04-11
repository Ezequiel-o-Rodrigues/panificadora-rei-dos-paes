# Imagens do site

## Logo oficial

Salve a logo da Panificadora Rei dos Pães como:

```
public/images/logo.png
```

Requisitos sugeridos:

- Formato: **PNG com fundo transparente** (ou quadrado 1:1 com fundo preto/circular)
- Dimensão mínima: **256x256 px** (o site serve a mesma imagem em tamanhos menores)
- Dimensão ideal: **512x512 px**

Assim que o arquivo `logo.png` existir nesta pasta, o componente `<Logo />` passa
a mostrar a imagem oficial automaticamente em todas as telas (header, footer,
login, admin). Não precisa recompilar — basta recarregar a página. Enquanto o
arquivo não existir, um SVG de coroa estilizada é exibido como fallback.

## Outras imagens

- `public/images/produtos/` — imagens dos produtos do cardápio (use slugs: `pao-frances.jpg`)
- `public/images/fachada.jpg` — foto da fachada da loja para a seção "Sobre"
- `public/images/interior.jpg` — foto do interior para galeria
