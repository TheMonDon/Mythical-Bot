const Command = require('../../base/Command.js');

class StartGiveaway extends Command {
  constructor(client) {
    super(client, {
      name: 'start-giveaway',
      description: 'Start a giveaway',
      usage: 'start-giveaway <Duration> <Winners> <Channel> <Prize>',
      // Change this to be more like create-item (future me!)
      requiredArgs: 4,
      category: 'Giveaways',
      aliases: ['gcreate', 'startgiveaway', 'gstart'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    if (!msg.member.permissions.has('ManageMessages')) {
      return this.client.util.errorEmbed(msg, 'You need to have the Manage Messages permission to start giveaways');
    }

    const parse = (await import('parse-duration')).default;
    const duration = parse(args[0]);
    const winnerCount = parseInt(args[1]);
    const channel = this.client.util.getChannel(msg, args[2]);
    args.shift();
    args.shift();
    args.shift();
    const prize = args.join(' ');

    if (isNaN(winnerCount)) {
      return this.client.util.errorEmbed(msg, 'Winner amount is not a number', 'Invalid Winner Count');
    }

    if (winnerCount < 1) {
      return this.client.util.errorEmbed(msg, 'Giveaways must have at least 1 winner.', 'Invalid Winner Count');
    } else if (winnerCount > 50) {
      return this.client.util.errorEmbed(msg, 'Giveaways can not have more than 50 winners.', 'Invalid Winner Count');
    }

    if (isNaN(duration)) {
      return this.client.util.errorEmbed(msg, 'Duration is not a number', 'Invalid Duration');
    }

    if (duration < 10000) {
      return this.client.util.errorEmbed(msg, 'Giveaways must be at least 10 seconds long.', 'Invalid Duration');
    } else if (duration > 3628800000) {
      return this.client.util.errorEmbed(msg, 'Giveaways cannot be longer than 6 weeks (42d)', 'Invalid Duration');
    }

    if (!channel) return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.conf, 'Invalid Channel');

    // Start the giveaway
    this.client.giveawaysManager.start(channel, {
      duration,
      prize,
      winnerCount,
      hostedBy: msg.member,
      embedColor: msg.settings.embedColor,
      messages: {
        giveaway: '',
        giveawayEnded: '',
        noWinner: 'Giveaway cancelled, no valid participants.',
        winners: 'Winners:',
        endedAt: 'Ended at',
        winMessage: {
          content: 'Congratulations, {winners}! You won **{this.prize}**!',
          replyToGiveaway: true,
        },
      },
    });

    return msg.channel.send(`:tada: Done! The giveaway for \`${prize}\` is starting in ${channel}`);
  }
}

module.exports = StartGiveaway;
