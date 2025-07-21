const Command = require('../../base/Command.js');
const { getColorFromURL } = require('color-thief-node');
const { createCanvas, loadImage } = require('canvas');
const tinycolor = require('tinycolor2');

class NowPlaying extends Command {
  constructor(client) {
    super(client, {
      name: 'now-playing',
      description: 'Shows what is currently playing',
      category: 'Music',
      usage: 'now-playing',
      aliases: ['np', 'nowplaying'],
      guildOnly: true,
    });
  }

  async run(msg) {
    const player = this.client.lavalink.getPlayer(msg.guild.id);
    const song = player?.queue.current;

    if (!song) {
      return this.client.util.errorEmbed(msg, 'There is nothing playing.');
    }

    const requester = msg.guild.members.cache.get(song.requester.id);

    const height = 360;
    const width = 1200;
    const thumbnailSize = 300;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.textDrawingMode = 'glyph';

    // ctx: your canvas context
    // x, y: position of the thumbnail
    // w, h: width and height of the thumbnail

    async function drawRoundedThumbnail(ctx, imageUrl, x, y, w, h, radius = 20) {
      const img = await loadImage(imageUrl);

      // Save current context before clipping
      ctx.save();

      // Shadow for "floating" effect
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 6;

      // Clip to rounded rectangle
      ctx.beginPath();
      roundedRect(ctx, x, y, w, h, radius);
      ctx.clip();

      // Draw the image inside clipped area
      ctx.drawImage(img, x, y, w, h);

      // Restore context to remove clipping and shadow for next draw
      ctx.restore();
    }

    function roundedRect(ctx, x, y, width, height, radius) {
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }

    const rgbColors = await getColorFromURL(song.info.artworkUrl);
    const primaryColor = tinycolor({ r: rgbColors[0], g: rgbColors[1], b: rgbColors[2] });

    const secondaryColor = primaryColor.clone().spin(30).lighten(10);

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    const color1 = primaryColor.clone().setAlpha(0.7).toRgbString();
    const color2 = secondaryColor.clone().setAlpha(0.5).toRgbString();
    const color3 = primaryColor.clone().lighten(15).setAlpha(0.4).toRgbString();

    gradient.addColorStop(0, color1);
    gradient.addColorStop(0.6, color2);
    gradient.addColorStop(1, color3);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const glassGradient = ctx.createLinearGradient(0, 0, 0, height);
    glassGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    glassGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    glassGradient.addColorStop(1, 'rgba(0, 0, 0, 0.15)');

    ctx.fillStyle = glassGradient;
    ctx.fillRect(0, 0, width, height);

    const dominantColor = primaryColor;

    // Optional overlay for readability
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load and draw album art
    const thumbnailY = (height - thumbnailSize) / 2; // centers vertically
    await drawRoundedThumbnail(ctx, song.info.artworkUrl, 30, thumbnailY, thumbnailSize, thumbnailSize);

    // Title
    let title = song.info.title;
    if (song.info.sourceName === 'youtube') {
      title = title.replace(/^.*?- */, '');
    }

    function fitTextToWidth(ctx, text, maxWidth, initialSize = 48, minSize = 18, fontFamily = 'Arial') {
      let fontSize = initialSize;

      do {
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
        const { width } = ctx.measureText(text);
        if (width <= maxWidth || fontSize <= minSize) break;
        fontSize--;
      } while (fontSize > minSize);

      return fontSize;
    }

    const padding = 60;
    const textStartX = thumbnailSize + padding;
    const maxTextWidth = width - textStartX - padding;

    // Get a readable font color (white or black)
    const titleFontColor = dominantColor.isLight() ? '#000000' : '#FFFFFF';
    const requesterFontColor = dominantColor.isLight() ? '#121212' : '#CCCCCC';
    const otherFontColor = dominantColor.isLight() ? '#1a1a1a' : '#bbbbbb';

    // Title
    const dynamicFontSize = fitTextToWidth(ctx, title, maxTextWidth);
    ctx.font = `bold ${dynamicFontSize}px Arial`;
    ctx.fillStyle = titleFontColor;
    ctx.fillText(title, textStartX, 80);

    // Author
    ctx.font = '36px Arial';
    ctx.fillText(song.info.author, 360, 130);

    // Progress Bar
    const duration = song.info.duration;
    const progress = Math.round((player.position / duration) * 20);
    const bar = '▬'.repeat(progress) + '🔘' + '▬'.repeat(20 - progress);

    ctx.font = '32px Arial';
    ctx.fillText(bar, 360, 200);

    const formatTime = (ms) => {
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      return `${m}:${s.toString().padStart(2, '0')}`;
    };

    ctx.font = '28px Arial';
    ctx.fillStyle = otherFontColor;
    ctx.fillText(`${formatTime(player.position)} / ${formatTime(duration)}`, 360, 240);

    const avatar = await loadImage(requester.displayAvatarURL({ extension: 'png', size: 128 }));
    const avatarSize = 32;
    const baseY = height - 90;

    // Set font
    ctx.font = '24px Arial';
    ctx.fillStyle = requesterFontColor;

    // Measure width of "Requested By:"
    const labelText = 'Requested By: ';
    const labelWidth = ctx.measureText(labelText).width;

    // Starting X position
    const baseX = textStartX;

    // Draw "Requested By:"
    ctx.fillText(labelText, baseX, baseY + 28); // +28 aligns with baseline

    // Draw avatar inline
    const avatarX = baseX + labelWidth + 8;
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, baseY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, baseY, avatarSize, avatarSize);
    ctx.restore();

    // Draw requester's display name after avatar
    const nameX = avatarX + avatarSize + 8;
    ctx.fillText(requester.displayName, nameX, baseY + 28);

    // Repeat mode
    ctx.font = '24px Arial';
    ctx.fillText(`Repeat Mode: ${this.client.util.toProperCase(player.repeatMode)}`, 360, 330);

    const buffer = canvas.toBuffer();

    await msg.channel.send({ files: [{ attachment: buffer, name: 'now-playing.png' }] });
  }
}

module.exports = NowPlaying;
