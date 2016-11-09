class CreateWeights < ActiveRecord::Migration
  def change
    create_table :weights do |t|
      t.decimal :weight, null: false
      t.date :date, null: false
      t.timestamps null: false
    end
  end
end
