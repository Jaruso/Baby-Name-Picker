import type { NameFilter, NameOption, NameStyle, Room } from "../types";

export interface NameStyleDefinition {
  id: NameStyle;
  label: string;
  description: string;
  origin: string;
  female: readonly string[];
  male: readonly string[];
}

const names = (value: string): readonly string[] => value.split(", ");

export const NAME_STYLE_DEFINITIONS = [
  {
    id: "modern" as const,
    label: "Modern US & UK",
    description: "Fresh favorites and newer classics",
    origin: "US",
    female: names("Addison, Adeline, Adria, Alina, Amara, Aria, Arielle, Aspen, Blair, Blaire, Briar, Brynn, Calla, Camille, Celeste, Collins, Daphne, Eden, Ember, Emilia, Esme, Everly, Fallon, Hadley, Harlow, Indie, Juniper, Kaia, Kinsley, Lainey, Lennon, Lola, Lyra, Maisie, Maren, Millie, Monroe, Navy, Oakley, Piper, Quinn, Reagan, Remi, Reese, Rhea, Rory, Rowan, Saylor, Sienna, Skye, Talia, Theodora, Wren, Zaria, Zara"),
    male: names("Alden, Anderson, Archer, Arlo, Atlas, August, Beckett, Bodhi, Brooks, Callan, Cash, Clark, Cohen, Colter, Crew, Dawson, Ellis, Ezra, Ford, Grey, Holden, Hudson, Jett, Kai, Knox, Landon, Lawson, Lennox, Lincoln, Luca, Mason, Merritt, Micah, Nash, Nico, Orion, Parker, Preston, Reid, Rhodes, River, Ronan, Sawyer, Silas, Stellan, Sutton, Tate, Theo, Tucker, Vaughn, Walker, Wells, Weston, Wilder, Zane"),
  },
  {
    id: "celtic" as const,
    label: "Irish & Scottish",
    description: "Celtic roots, familiar sounds",
    origin: "IE",
    female: names("Ailsa, Aine, Ainsley, Alannah, Ailbhe, Blaise, Brigid, Bronwen, Caoimhe, Catriona, Ciara, Clodagh, Cora, Deirdre, Eilidh, Eimear, Elspeth, Enya, Fiona, Iona, Isobel, Keeva, Kenna, Lachlan, Leona, Lorna, Maeve, Mairi, Mckenna, Moira, Niamh, Orla, Rhiannon, Riona, Roisin, Rowan, Saoirse, Sinead, Skye, Sorcha, Teagan, Una, Aisling, Aven, Blair, Breanna, Darcy, Keely, Kiera, Maisie, Marnie, Nola, Rhea, Taryn, Willa"),
    male: names("Alasdair, Aodh, Blair, Bodhan, Brodie, Callum, Cian, Cillian, Cormac, Declan, Donal, Eamon, Ewan, Fergal, Finlay, Fintan, Fraser, Gavin, Hamish, Iain, Keegan, Keir, Kian, Lachlan, Liam, Lorcan, Malcolm, Niall, Oisin, Oran, Padraig, Quinn, Ruaridh, Ruairi, Seamus, Shea, Tiernan, Torin, Aidan, Brennan, Brogan, Caelan, Conall, Conor, Darragh, Emmett, Finnian, Keiran, Kieran, Lyle, Magnus, Nolan, Ronan, Tavish, Tolan, Vaughn"),
  },
  {
    id: "french" as const,
    label: "French",
    description: "Soft, elegant continental names",
    origin: "FR",
    female: names("Adeline, Adele, Alix, Amelie, Anais, Anne-Laure, Apolline, Ariane, Aurore, Brigitte, Camille, Capucine, Celeste, Chloe, Claire, Colette, Delphine, Elodie, Estelle, Eugenie, Fleur, Gabrielle, Helene, Ines, Josephine, Juliette, Léa, Liane, Louise, Lucie, Maelle, Manon, Margaux, Mathilde, Mélanie, Noemie, Oceane, Odette, Pauline, Solene, Sylvie, Violette, Yvette, Zoe, Amour, Anaelle, Celia, Diane, Elise, Emilie, Genevieve, Iris, Laure, Maud, Romane, Sabine"),
    male: names("Adrien, Alain, Alexandre, Ambroise, Antoine, Armand, Bastien, Benoit, Blaise, Cédric, Clément, Corentin, Damien, Étienne, Fabien, Gaston, Gautier, Gérard, Hugo, Jacques, Jean, Jules, Laurent, Loic, Lucien, Marcel, Maxence, Matthieu, Olivier, Pascal, Philippe, Pierre, Quentin, Rémi, Renaud, Sébastien, Thibault, Thierry, Tristan, Yves, Amaury, Arnaud, Augustin, Baptiste, Charles, Émile, Florent, Grégoire, Henri, Jérôme, Léon, Mathis, Nicolas, Raphaël, Simon"),
  },
  {
    id: "german" as const,
    label: "German",
    description: "Grounded names with a classic edge",
    origin: "DE",
    female: names("Ada, Adelheid, Alina, Amalia, Anika, Annika, Antonia, Astrid, Beate, Birgit, Carlotta, Charlotte, Clara, Elke, Emilia, Erika, Eva, Frieda, Greta, Hanna, Heidi, Helga, Ida, Ingrid, Johanna, Juna, Karla, Klara, Lara, Lea, Lena, Liesel, Lotta, Luisa, Maren, Marlene, Mathilda, Nadine, Nina, Paula, Romy, Sabine, Saskia, Selma, Thea, Ute, Vera, Wilhelmina, Yvonne, Anneliese, Britta, Elke, Frederike, Gisela, Marit, Rosalie"),
    male: names("Achim, Anselm, Armin, Axel, Benedikt, Bernd, Bruno, Conrad, Dieter, Dirk, Emil, Ernst, Fabian, Falk, Felix, Florian, Franz, Friedrich, Georg, Gunter, Hans, Heiko, Heinz, Herman, Jan, Jorg, Jonas, Jürgen, Karl, Klaus, Lars, Leonhard, Ludwig, Manfred, Matthias, Max, Moritz, Otto, Rainer, Rolf, Sebastian, Siegfried, Stefan, Sven, Theodor, Udo, Ulrich, Volker, Walter, Wilhelm, Wolfgang, Albrecht, Dominik, Joachim, Kurt, Martin"),
  },
  {
    id: "italian" as const,
    label: "Italian",
    description: "Warm, melodic Italian favorites",
    origin: "IT",
    female: names("Adriana, Alessia, Alice, Allegra, Angelica, Anna, Antonella, Arianna, Beatrice, Bianca, Carlotta, Caterina, Cecilia, Chiara, Claudia, Cristina, Daniela, Donatella, Elena, Eleonora, Elisa, Emilia, Federica, Fiorella, Francesca, Gaia, Giada, Giorgia, Grazia, Ilaria, Isabella, Laura, Livia, Lucrezia, Maddalena, Mariella, Martina, Michela, Nicoletta, Paola, Raffaella, Renata, Rita, Rosalia, Sabrina, Serafina, Silvia, Simona, Sofia, Stefania, Teresa, Valentina, Veronica, Viola, Vittoria, Aurora"),
    male: names("Alberto, Alessio, Alessandro, Andrea, Angelo, Antonio, Bruno, Carlo, Claudio, Cosimo, Daniele, Davide, Domenico, Edoardo, Enrico, Eros, Fabio, Federico, Filippo, Flavio, Franco, Gabriele, Giorgio, Giacomo, Giovanni, Leonardo, Lorenzo, Luca, Marcello, Marco, Mario, Matteo, Michele, Nino, Orlando, Paolo, Raffaele, Renato, Riccardo, Roberto, Romeo, Salvatore, Sergio, Stefano, Tiziano, Tommaso, Ugo, Valentino, Vincenzo, Vittorio, Adriano, Cesare, Elio, Fabrizio, Massimo, Silvio"),
  },
  {
    id: "nordic" as const,
    label: "Nordic",
    description: "Clean lines and northern roots",
    origin: "SE",
    female: names("Aina, Alva, Anneli, Annika, Astrid, Birgit, Britta, Dagmar, Ebba, Eira, Elsa, Frida, Freja, Grethe, Hedda, Helle, Ida, Ilse, Ingrid, Jette, Johanne, Kajsa, Karin, Karina, Kirsten, Lene, Linnea, Liv, Maja, Malin, Marianne, Marta, Nanna, Nora, Ragna, Runa, Saga, Signe, Siv, Solveig, Sonja, Stina, Svea, Thyra, Tove, Ulla, Vera, Ylva, Asta, Bodil, Cille, Ellinor, Gunhild, Hanne, Mette"),
    male: names("Anders, Arne, Asger, Bjorn, Bo, Casper, Dag, Einar, Erik, Espen, Finn, Frej, Gunnar, Gustav, Hans, Isak, Jari, Jens, Joakim, Kjell, Knut, Lars, Leif, Mads, Mats, Nils, Oskar, Per, Rasmus, Soren, Stig, Sven, Tage, Torben, Ulf, Viggo, Aksel, Bjarne, Carl, Edvin, Emil, Gustav, Halvor, Ivar, Jannik, Kasper, Leif, Mikkel, Nils, Odd, Rune, Stellan, Torkel, Valdemar, Vidar"),
  },
] as const satisfies readonly NameStyleDefinition[];

export const NAME_STYLES = NAME_STYLE_DEFINITIONS.map(({ id }) => id);

export function nameStyleById(id: NameStyle): NameStyleDefinition {
  const style = NAME_STYLE_DEFINITIONS.find((candidate) => candidate.id === id);
  if (!style) throw new Error(`Unknown name style: ${id}`);
  return style;
}

function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function nameOptionsForStyle(styleId: NameStyle, filter: NameFilter): NameOption[] {
  const style = nameStyleById(styleId);
  const values = [
    ...(filter === "male" ? [] : style.female.map((name) => ({ name, gender: "female" as const }))),
    ...(filter === "female" ? [] : style.male.map((name) => ({ name, gender: "male" as const }))),
  ];
  const seen = new Set<string>();
  return values
    .filter(({ name }) => {
      const key = slug(name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(({ name, gender }) => ({
      id: `style-${styleId}-${gender}-${slug(name)}`,
      name,
      gender,
      origin: style.origin,
    }));
}

export function enabledStyleOptions(room: Room): NameOption[] {
  const knownNames = new Set(
    [...Object.values(room.names ?? {}), ...Object.values(room.suggestions ?? {})].map(({ name }) => slug(name)),
  );
  const seen = new Set(knownNames);
  return NAME_STYLES
    .filter((style) => room.styles?.[style])
    .flatMap((style) => nameOptionsForStyle(style, room.filter))
    .filter(({ name }) => {
      const key = slug(name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function enabledStyleName(room: Room, nameId: string): NameOption | undefined {
  return enabledStyleOptions(room).find((name) => name.id === nameId);
}
