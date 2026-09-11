Estándares de Nombramiento en JavaScript

Los estándares adoptados se basan en la _Airbnb JavaScript Style Guide_, ampliamente reconocida y validada por la comunidad de desarrollo en JavaScript y Node.js.

<table>
<thead>
<tr>
<th>Elemento</th>
<th>Convención</th>
<th>Ejemplo</th>
<th>Referencia</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Variables y Constantes Primitivas</strong></td>
<td><code>camelCase</code> (Variables) / <code>UPPER_SNAKE_CASE</code> (Constantes globales)</td>
<td><code>let userCounter = 0;</code><br><code>const MAX_RETRIES = 3;</code></td>
<td>https://google.github.io/styleguide/jsguide.html#naming-local-variable-names</td>
</tr>
<tr>
<td><strong>Funciones y Métodos</strong></td>
<td><code>camelCase</code> (preferiblemente verbos descriptivos)</td>
<td><code>function calculateTotal(price, tax) { ... }</code></td>
<td>https://google.github.io/styleguide/jsguide.html#features-functions-top-level-functions</td>
</tr>
<tr>
<td><strong>Clases y Constructores</strong></td>
<td><code>UpperCamelCase</code></td>
<td><code>class ShoppingCart { ... }</code></td>
<td>https://google.github.io/styleguide/jsguide.html#naming-class-names</td>
</tr>
<tr>
<td><strong>Atributos y Propiedades de Clases</strong></td>
<td><code>camelCase</code> (pueden usar sufijo <code></code> para indicar privacidad interna)</td>
<td><code>this.userName = 'Ana';</code><br><code>this.cache = new Map();</code></td>
<td>https://google.github.io/styleguide/jsguide.html#naming-method-names</td>
</tr>
<tr>
<td><strong>Archivos de Clases o Componentes</strong></td>
<td><code>PascalCase.js</code> o <code>kebab-case.js</code> (preferiblemente <code>PascalCase.js</code> para componentes/clases principales)</td>
<td><code>UserProfileCard.jsx</code><br><code>order-service.js</code></td>
<td>https://google.github.io/styleguide/jsguide.html#naming-class-names</td>
</tr>
<tr>
<td><strong>Archivos de Módulos / Utilidades</strong></td>
<td><code>kebab-case.js</code> o <code>camelCase.js</code></td>
<td><code>date-formatter.js</code></td>
<td>https://google.github.io/styleguide/jsguide.html#naming-module-local-names</td>
</tr>
</tbody>
</table>
