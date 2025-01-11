const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const { EmbedBuilder } = require('discord.js');
const DDG = require('duck-duck-scrape');

class DuckDuckGo extends Command {
  constructor(client) {
    super(client, {
      name: 'duck-duck-go',
      description: 'Searches DuckDuckGo for the specified query.',
      usage: 'duck-duck-go <query>',
      requiredArgs: 1,
      category: 'Search',
      aliases: ['ddg', 'duck'],
    });
  }

  async run(msg, args) {
    const query = args.join(' ');

    function recursiveReplace(obj, searchValue, replaceValue) {
      if (typeof obj === 'string') {
        return obj.replace(new RegExp(searchValue, 'g'), replaceValue);
      } else if (Array.isArray(obj)) {
        return obj.map((item) => recursiveReplace(item, searchValue, replaceValue));
      } else if (typeof obj === 'object' && obj !== null) {
        return Object.fromEntries(
          Object.entries(obj).map(([key, value]) => [key, recursiveReplace(value, searchValue, replaceValue)]),
        );
      }
      return obj; // Return as is for other types (e.g., numbers, null)
    }

    const searchResults = await DDG.search(query, {
      safeSearch: DDG.SafeSearchType.STRICT,
    });
    const results = searchResults.results;
    if (searchResults.noResults) {
      return this.client.util.errorEmbed(msg, 'No search results were found.');
    }

    const cleanedResults = recursiveReplace(results, '<b>', '**');
    const cleanedResultsFinal = recursiveReplace(cleanedResults, '</b>', '**');

    const embed = new EmbedBuilder()
      .setTitle(`Search results for ${query.slice(0, 200)}`)
      .setColor(msg.settings.embedColor)
      .setDescription(
        stripIndents`
         1. [${cleanedResultsFinal[0].title}](${cleanedResultsFinal[0].url}) \n${cleanedResultsFinal[0].description}
         2. [${cleanedResultsFinal[1].title}](${cleanedResultsFinal[1].url}) \n${cleanedResultsFinal[1].description}
         3. [${cleanedResultsFinal[2].title}](${cleanedResultsFinal[2].url}) \n${cleanedResultsFinal[2].description}
         4. [${cleanedResultsFinal[3].title}](${cleanedResultsFinal[3].url}) \n${cleanedResultsFinal[3].description}
         5. [${cleanedResultsFinal[4].title}](${cleanedResultsFinal[4].url}) \n${cleanedResultsFinal[4].description}`,
      );

    return msg.channel.send({ embeds: [embed] });
  }
}
module.exports = DuckDuckGo;
