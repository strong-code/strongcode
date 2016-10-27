class MediaController < ApplicationController
  before_action :api_authenticate

  def create
    ext       = File.extname(params[:media].original_filename)
    filename  = SecureRandom.hex[0..5] + ext
    folder    = get_folder(ext)
    directory = "public/media/#{folder}"
    path = File.join(directory, filename)
    File.open(path, 'wb') { |f| f.write(params[:media].read) }
    render text: "http://strongco.de/media/#{folder}/#{filename}\n"
  end

  private

  def get_folder(ext)
    types = {
      p: ['.png', '.jpg', '.gif', '.jpeg', '.tiff'],
      v: ['.mpg', '.mp4', '.webm', '.avi', '.mkv', '.gifv', '.m4v'],
      txt:   ['.txt', '.md', '.rtf', '.doc', '.docx']
    }

    types.each do |k, v|
      return k.to_s if v.include?(ext)
    end

    'o'
  end

end
