import { ProprietaireType } from '../types'

const StockDisplay = ({ proprietaire }: { proprietaire: ProprietaireType }) => {
  return (
    <div className="p-4 bg-light rounded mb-3">
      <h5 className="mb-3">{proprietaire.nomPrenom}</h5>
      <div className="row">
        <div className="col-6">
          <div className="d-flex align-items-center justify-content-between p-3 bg-white rounded shadow-sm">
            <div>
              <small className="text-muted d-block">Stock Olive</small>
              <h3 className="mb-0">{proprietaire.quantiteOlive || 0}</h3>
              <small className="text-muted">kg</small>
            </div>
            <div className="fs-1">🫒</div>
          </div>
        </div>
        <div className="col-6">
          <div className="d-flex align-items-center justify-content-between p-3 bg-white rounded shadow-sm">
            <div>
              <small className="text-muted d-block">Stock Huile</small>
              <h3 className="mb-0">{proprietaire.quantiteHuile || 0}</h3>
              <small className="text-muted">litres</small>
            </div>
            <div className="fs-1">🫙</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StockDisplay