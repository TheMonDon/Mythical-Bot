const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const db = require('quick.db');
const DiscordJS = require('discord.js');

class changelog extends Command {
  constructor (client) {
    super(client, {
      name: 'changelog',
      description: 'View or change the changelog.',
      usage: 'changelog [changes]',
      category: 'General'
    });
  }

  async run (msg, args, level) { // eslint-disable-line no-unused-vars
    const text = args.join(' ');

    (async () => {
      if (!text || text.length < 0) {
        return msg.channel.send(stripIndents `The current changlog is:
        \`\`\`${db.get('bot.changelog') || 'N/A'}\`\`\``);
      }

      if (level < 9) return msg.channel.send('You must be a bot admin to change the changelog.');
    
      const em = new DiscordJS.MessageEmbed()
        .setTitle('Are you sure?')
        .setColor('AQUA')
        .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
        .setDescription(`Do you want to change the change log to... \`\`\`${text}\`\`\``)
        .setTimestamp();
      const embed = await msg.channel.send(em);
      await embed.react('✅');
      await embed.react('❌');
      const filter = (reaction, user) => {
        return ['✅', '❌'].includes(reaction.emoji.name) && user.id === msg.author.id;
      };

      embed.awaitReactions(filter, {
        max: 1,
        time: 60000,
        errors: ['time']
      })
        .then(collected => {
          const reaction = collected.first();

          if (reaction.emoji.name === '✅') {
            msg.delete();
            embed.delete();
            const em = new DiscordJS.MessageEmbed()
              .setTitle('The changelog has been changed to:')
              .setAuthor(msg.member.displayName, msg.author.displayAvatarURL())
              .setColor('AQUA')
              .setDescription(`\`\`\`${text}\`\`\``)
              .setTimestamp();
            msg.channel.send(em);
            db.set('bot.changelog', text);
          } else if (reaction.emoji.name === '❌') {
            msg.delete();
            embed.delete();
            msg.channel.send('The changelog has not been changed.');
          }
        })
        .catch(() => {
          msg.reply('You did not react in time.');
        });

    })();
     
  }
}

module.exports = changelog;
