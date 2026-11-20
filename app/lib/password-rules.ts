export function passwordRequirements(password: string) {
  return [
    { id: "length", label: "Pelo menos 8 caracteres", valid: password.length >= 8 },
    { id: "uppercase", label: "Uma letra maiúscula", valid: /\p{Lu}/u.test(password) },
    { id: "lowercase", label: "Uma letra minúscula", valid: /\p{Ll}/u.test(password) },
    { id: "number", label: "Um número de 0 a 9", valid: /[0-9]/.test(password) },
    // Mirrors Java's character classes, including its default ASCII whitespace.
    { id: "special", label: "Um caractere especial, como !, @ ou #", valid: /[^\p{L}\p{N} \t\n\v\f\r]/u.test(password) },
    { id: "bytes", label: "No máximo 72 bytes (acentos e emojis ocupam mais espaço)", valid: new TextEncoder().encode(password).length <= 72 },
  ];
}
