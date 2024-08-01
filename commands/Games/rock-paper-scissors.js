const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const { EmbedBuilder } = require('discord.js');

class RockPaperScissors extends Command {
  constructor(client) {
    super(client, {
      name: 'rock-paper-scissors',
      description: 'Play a game of rock paper scissors',
      usage: 'rock-paper-scissors <member>',
      requiredArgs: 1,
      category: 'Games',
      aliases: ['rockpaperscissors', 'rps'],
    });
  }

  async run(msg, args) {
    const p1 = msg.author;
    const chan = msg.channel;
    let authReply;
    let memReply;
    let reply;

    const current = this.client.games.get(msg.channel.id);
    if (current) {
      return this.client.util.errorEmbed(msg, `Please wait until the current game of \`${current.name}\` is finished.`);
    }

    const mem = await this.client.util.getMember(msg, args.join(' '));
    if (!mem) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Invalid Member');
    if (mem.user.id === msg.author.id)
      return this.client.util.errorEmbed(msg, "You can't play against yourself, silly.");

    this.client.games.set(msg.channel.id, { name: this.help.name, user: msg.author.id });

    // If the opponent isn't a bot, ask them if they accept the challenge.
    if (!mem.user.bot) {
      await msg.channel.send(`${mem}, do you accept this challenge?`);
      const verification = await this.client.util.verify(msg.channel, mem);
      if (!verification) {
        this.client.games.delete(msg.channel.id);
        return msg.channel.send('Looks like they declined...');
      }
      reply = await msg.channel.send(
        `Alright, get ready ${msg.member} and ${mem}! ${msg.member.displayName} is up first. I'll send you both a DM.`,
      );
      await msg.author
        .send(
          stripIndents`
      Please type your response below.

      - Rock
      - Paper
      - Scissors

      You have 1 minute!
    `,
        )
        .then(async (msg) => {
          setTimeout(function () {}, 1000);
          await msg.channel
            .awaitMessages({
              filter: (msg) => msg.content.match(/^rock|paper|scissors$/i) && msg.author.id === p1.id,
              max: 1,
              time: 60000,
              errors: ['time'],
            })
            .then((collected) => {
              authReply = collected.first().content.toLowerCase();
              msg.channel.send(`Your response of \`${collected.first().content.toLowerCase()}\` has been saved.`);
            })
            .catch(() => {
              msg.channel.send('Error: You did not reply in time.');
              reply.delete();
              this.client.games.delete(msg.channel.id);
              return chan.send('The game starter did not reply in time, so the game was forfeited.');
            });
        });
      await mem
        .send(
          stripIndents`
        Please type your response below.
      
        - Rock
        - Paper
        - Scissors
      
        You have 1 minute!
      `,
        )
        .then(async (msg) => {
          setTimeout(function () {}, 1000);
          await msg.channel
            .awaitMessages({
              filter: (msg) => msg.content.match(/^rock|paper|scissors$/i) && msg.author.id === mem.id,
              max: 1,
              time: 60000,
              errors: ['time'],
            })
            .then((collected) => {
              memReply = collected.first().content.toLowerCase();
              msg.channel.send(
                `Your response of \`${collected
                  .first()
                  .content.toLowerCase()}\` has been saved. \nCheck ${chan} for the results!`,
              );
              p1.send(`${mem} has replied, check ${chan} for the results.`);
            })
            .catch(() => {
              msg.channel.send('Error: You did not reply in time.');
              reply.delete();
              return chan.send(`${mem.displayName} did not reply in time, so the game was forfeited.`);
            });
        });
    } else {
      const choices = ['rock', 'paper', 'scissors'];
      memReply = choices[Math.floor(Math.random() * choices.length)];

      await msg.channel
        .send(
          stripIndents`
      Please type your response below.

      - Rock
      - Paper
      - Scissors

      You have 1 minute!
    `,
        )
        .then(async (msg) => {
          setTimeout(function () {}, 1000);
          await msg.channel
            .awaitMessages({
              filter: (msg) => msg.content.match(/^rock|paper|scissors$/i) && msg.author.id === p1.id,
              max: 1,
              time: 60000,
              errors: ['time'],
            })
            .then((collected) => {
              authReply = collected.first().content.toLowerCase();
            })
            .catch(() => {
              msg.channel.send('Error: You did not reply in time.');
              reply.delete();
              this.client.games.delete(msg.channel.id);
              return chan.send('The game starter did not reply in time, so the game was forfeited.');
            });
        });
    }

    const embed = new EmbedBuilder().setTitle('Rock - Paper - Scissors').setColor(msg.settings.embedColor);

    // It's a tie.
    if (authReply === memReply) {
      embed.setDescription(stripIndents`
        No winner this time!
        ${mem} and ${p1} both chose the same thing.
        
        The tied item was: ${authReply}
        `);
    }

    // Figure out who won.
    if (
      (authReply === 'rock' && memReply === 'scissors') ||
      (authReply === 'paper' && memReply === 'rock') ||
      (authReply === 'scissors' && memReply === 'paper')
    ) {
      embed.setDescription(stripIndents`
        The winner was: ${p1}!
        The winning item was: ${authReply}
      `);
    } else if (
      (memReply === 'rock' && authReply === 'scissors') ||
      (memReply === 'paper' && authReply === 'rock') ||
      (memReply === 'scissors' && authReply === 'paper')
    ) {
      embed.setDescription(stripIndents`
        The winner was: ${mem}!
        The winning item was: ${memReply}
      `);
    }

    if (reply) reply.delete();
    this.client.games.delete(msg.channel.id);
    return chan.send({ embeds: [embed] });
  }
}

module.exports = RockPaperScissors;
