const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');
const TheDictionary = require('react-native-oxford-dictionary');

class Dictionary extends Command {
  constructor (client) {
    super(client, {
      name: 'dictionary',
      description: 'Get the definition of a word from Oxford English Dictionary',
      usage: 'dictionary <word>',
      category: 'Information',
      aliases: ['dict', 'dic']
    });
  }

  async run (msg, args) {
    let examples = '';
    let phrases = '';
    let synonyms = '';

    const input = args.join(' ').toLowerCase();
    if (!input || input.length < 1) return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}Dictionary <word>`);

    const dict = new TheDictionary({ app_id: config.OxfordID, app_key: config.OxfordKey, source_lang: 'en-us' });
    const define = dict.find(input);

    define.then((res) => {
      if (!res) return msg.channel.send('No entry was found for that word.');

      const definition = res.results[0]?.lexicalEntries[0]?.entries[0]?.senses[0]?.definitions[0];
      const pronunciation = res.results[0]?.lexicalEntries[0]?.entries[0]?.pronunciations[0]?.phoneticSpelling;
      const etymology = res.results[0]?.lexicalEntries[0]?.entries[0]?.etymologies[0];
      const examplesObj = res.results[0]?.lexicalEntries[0]?.entries[0]?.senses[0]?.examples;
      const phrasesObj = res.results[0]?.lexicalEntries[0]?.phrases;
      const synonymsObj = res.results[0].lexicalEntries[0].entries[0].senses[0].subsenses[0].synonyms;

      if (examplesObj) {
        examplesObj.forEach((example) => {
          examples += `\n${example.text}`;
        });
      }

      if (phrasesObj) {
        phrasesObj.forEach((phrase) => {
          phrases += `\n${phrase.text}`;
        });
      }

      if (synonymsObj) {
        synonymsObj.forEach((synonym) => {
          synonyms += `\n${synonym.text}`;
        });
      }

      if (!definition) return msg.channel.send('No entry was found for that word.');

      const em = new EmbedBuilder()
        .setTitle('Dictionary Information')
        .setColor(msg.settings.embedColor)
        .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
        .addFields([
          { name: 'Definition', value: definition, inline: false },
          { name: 'Etymology', value: etymology || 'No etymology provided', inline: true },
          { name: 'Examples', value: examples || 'No examples provided', inline: true },
          { name: 'Phrases', value: phrases || 'No phrases provided', inline: true },
          { name: 'Synonyms', value: synonyms || 'No synonyms provided', inline: true },
          { name: 'Pronunciation', value: pronunciation || 'No pronunciation provided', inline: true }
        ]);

      return msg.channel.send({ embeds: [em] });
    }, (err) => {
      if (err.error === 'No entry found matching supplied source_lang, word and provided filters') return msg.channel.send('No entry was found for that word.');
      return msg.channel.send(`An error occurred: \`${err.error}\`. Try again later!`);
    });
  }
}

module.exports = Dictionary;
