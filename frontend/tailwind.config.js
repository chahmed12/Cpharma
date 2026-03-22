/**
 * tailwind.config.js
 *
 * Note : Tailwind CSS v4 n'utilise plus ce fichier pour la détection de contenu.
 * La configuration se fait désormais directement dans le CSS via les directives @source.
 * Ce fichier est conservé pour la compatibilité avec les outils (IDE, plugins) qui
 * s'appuient encore sur lui, mais il n'est PAS chargé par PostCSS en v4.
 *
 * Pour personnaliser les tokens (couleurs, spacing, etc.) en v4, utilisez les
 * directives @theme dans votre fichier CSS principal (src/index.css).
 *
 * Référence : https://tailwindcss.com/docs/upgrade-guide
 */

/** @type {import('tailwindcss').Config} */
export default {
    // En Tailwind v4, la détection de contenu est automatique.
    // Cette valeur est ignorée mais conservée pour la lisibilité.
    content: [
        './index.html',
        './src/**/*.{ts,tsx}',
    ],
    theme: {
        extend: {},
    },
    plugins: [],
};