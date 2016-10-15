class User < ActiveRecord::Base
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :trackable, :validatable

  has_many :journal_entries

  def generate_api_key
    self.api_key = SecureRandom.base64.tr('+/=', 'Qrt')
    self.save
    self.api_key
  end

end
