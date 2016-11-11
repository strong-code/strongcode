class Weight < ActiveRecord::Base

  def self.for_today
    record = Weight.where(date: Date.today).first
  end

end
